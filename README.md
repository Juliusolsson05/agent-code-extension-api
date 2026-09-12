# agent-code-extension-api

Types and build helpers for [Agent Code](https://github.com/Juliusolsson05/agent-code) extensions. API v2 gives one shared runtime ownership of commands and state while independently mounted view modules own their DOM. SDK 0.6 adds the first scoped project service, `fs.read`. The `defineExtension` helper and API v1 types remain available for existing bundles.

## A v2 extension

Install the SDK as a development dependency and bundle it with your extension. API v2 requires an Agent Code build with v2 support (host PR #577).

`agent-code.extension.json` at the repository root:

```json
{
  "id": "counter",
  "name": "Counter",
  "description": "Shared state across independent views.",
  "version": "0.1.0",
  "apiVersion": 2,
  "entry": "dist/runtime.js",
  "activationEvents": ["onCommand:counter.increment", "onView:counter.main"],
  "contributes": {
    "commands": [
      { "id": "counter.open", "title": "Counter: Open" },
      { "id": "counter.increment", "title": "Counter: Increment" }
    ],
    "views": [{ "id": "counter.main", "title": "Counter", "mount": "panel", "entry": "dist/view.js" }]
  }
}
```

`src/runtime.ts`:

```ts
import { defineRuntime } from 'agent-code-extension-api'

export default defineRuntime({
  async activate(context) {
    let count = (await context.api.storage.get<number>('count')) ?? 0
    context.registerCommand('counter.increment', async () => {
      const next = ++count
      // Persist when state changes: cleanup has a deadline and no write authority.
      await context.api.storage.set('count', next)
      await context.views.publish('counter.main', { count: next })
      return next
    })
    await context.views.publish('counter.main', { count })
  },
})
```

`src/view.ts`:

```ts
import { defineView } from 'agent-code-extension-api'

export default defineView<{ count: number }>({
  mount(element, context) {
    const render = (state: { count: number } | undefined) => {
      element.textContent = `Count: ${state?.count ?? 0}`
    }
    render(context.runtime.state())
    return context.runtime.subscribe(render)
  },
})
```

`vite.config.ts`:

```ts
import { extensionViteConfig } from 'agent-code-extension-api'

export default extensionViteConfig({
  entries: { runtime: 'src/runtime.ts', view: 'src/view.ts' },
})
```

Run `vite build` and commit the entire `dist/` directory, including shared chunks. The manifest paths point to the built files. For local development, choose the repository folder containing the manifest in Agent Code's **Load extension from folder** action. The preset bundles your dependencies, including your own React if used. Apply emitted CSS from the view, or inject your styles; the host does not automatically load every stylesheet in a bundle.

## Lifetime and communication

- `entry` is the runtime module. Each v2 view has its own `entry` exporting `mount(element, context)`, either as a named export or in a default object. View mounts and their returned cleanup functions are synchronous.
- `onStartupFinished` and `*` request background startup, including after installation/update. `onCommand:<id>` and `onView:<id>` permit lazy activation for that contribution. Absent events never activate a cold runtime. Once running, registered commands can execute without another activation event.
- Closing the last view leaves the runtime alive. Commands do not open a view. An open command matching a view id, or `<extensionId>.open` for a single-view extension, is handled by the host.
- `context.views.publish(viewId, json)` replaces the latest state for that view type. All attached instances receive it. A view reads `runtime.state()` for the initial snapshot and subscribes for later updates; state is undefined until the first publication.
- For interactions, a runtime calls `registerRequest(name, handler)`. A view calls `context.runtime.request(name, input)`. The handler receives the input and a host-issued `{ id, instanceId }` view identity. Validate your application's input shape inside the handler; the transport validates bounded JSON.
- Command results and errors are acknowledged. A timed-out command is not replayed: its outcome may be unknown. Closing a view cancels requests that have not been dispatched and rejects pending replies. Already started work may finish; it is never replayed.

The runtime API provides extension identity, namespaced durable storage, and the API v2 filesystem service. The view API additionally provides `ui.close()`, `ui.showToast()`, theme tokens and permissioned metadata observation. A background runtime has no implicit focused view or project.

Declare `"fs.read"` in the manifest, then call the same API from a runtime or view:

```ts
const file = await context.api.files.readText({
  sessionId: 'the-session-you-are-targeting',
  path: 'src/index.ts',
})
```

Main resolves the live session id to its spawn cwd. The path must be relative and
cannot escape through a symlink. Reads accept UTF-8 text files up to 96 KiB. There
is no implicit focused target because focus can change while a call is pending.
Filesystem writes, transcript, Git, prompting and network APIs are not exposed yet.

Storage allows 256 keys and 1 MiB of encoded state per extension, with each value also subject to the JSON limits below. Reads and writes share an ordered queue (32 pending per extension, 256 globally). Oversized writes fail without replacing the previous snapshot. Corrupt or unreadable saved files are preserved and reported as errors; repair the saved state before retrying.

Declared settings use their full contribution id as a storage key. Read that key and fall back to the declared default when it is absent. Uninstall preserves saved extension data; browser localStorage/cookies are disposable and are not the persistence contract.

Runtime JSON is limited to 4096 values, depth 32 and 128 Ki characters. Startup has a 10-second deadline, invocations 30 seconds, and at most 32 calls may be pending per extension. Normal shutdown allows up to 500 ms for `deactivate()` and subscriptions, after API authority has been revoked. Save state on mutation, and use cleanup for releasing local timers/listeners. Process failure or forced shutdown can skip cleanup.

## Contributed themes

SDK 0.5.0 adds `contributes.themes` to both manifest versions. Themes appear in
Agent Code's appearance picker without activating extension code:

```ts
themes: [{
  id: 'counter.night', title: 'Counter Night',
  colors: { canvas: '#102030', ink: '#f0e0d0', accent: '#78abcd' },
}]
```

Use your extension id as the contribution namespace. `EXTENSION_THEME_COLOR_KEYS`
lists the supported tokens; omitted colors inherit Agent Code's default palette.
Values are `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`, or `transparent`. Arbitrary CSS,
URLs and variables are rejected. A manifest may contribute up to 16 themes, each
with at least one color. Font and corner settings remain user-controlled.

Updates replace the palette. Removing the extension temporarily uses Dark while
preserving the selection, so reinstall restores it. User-saved themes remain
separate; the appearance picker's New theme action can copy the current colors.

## Compatibility

API v1 keeps the `defineExtension({ activate(context) { context.registerView(...) } })` contract. Its module executes separately in each visible view; it does not gain v2 background ownership. Migrate shared state and commands to `defineRuntime`, move DOM work to `defineView`, declare each built view entry, and set `apiVersion: 2` with explicit activation events.

The old single-entry `extensionViteConfig({ entry, fileName })` remains supported. Do not combine those options with `entries`.

## SDK verification

`npm test` builds the SDK, typechecks the counter author fixture, and builds/imports its independent modules through the real Vite preset. The Agent Code Electron journey uses the same fixture builder to install and execute these artifacts across real runtime/view boundaries. CI also checks that rebuilding leaves committed `dist/` unchanged, because Git-based consumers execute that output.
