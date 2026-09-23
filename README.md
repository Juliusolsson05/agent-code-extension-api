# agent-code-extension-api

Types and build helpers for [Agent Code](https://github.com/Juliusolsson05/agent-code) extensions.

An API v2 extension has two kinds of code:

- **Runtime:** one module per extension that owns commands, state and background work. It runs in a hidden, sandboxed document.
- **Views:** one or more modules that render UI into a modal or a pane. Each open view is its own sandboxed document and talks to the runtime through requests and published state.

Your code has no Node.js access, no network access, and no access to Agent Code internals. Everything it can do is listed in [API reference](#api-reference).

## Install

```bash
npm i -D github:Juliusolsson05/agent-code-extension-api#v0.8.0
```

The SDK is distributed from GitHub, not npm; its built `dist/` is committed. It contains types and a Vite preset only. Your extension bundles what it uses, so installing an extension never downloads the SDK.

API v2 needs an Agent Code build that includes the extension platform. Older builds refuse v2 manifests at install.

## Quick start

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
      count += 1
      await context.api.storage.set('count', count) // persist on change, not in deactivate
      await context.views.publish('counter.main', { count })
      return count
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
    const render = (state?: { count: number }) => {
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

Run `vite build`, commit `dist/`, and load the folder in Agent Code with **Load extension from folder**.

## How an extension runs

### Activation

The runtime starts only for an event the manifest declares in `activationEvents`:

| Event | Starts the runtime |
| --- | --- |
| `onStartupFinished` | When Agent Code starts, and after install or update. |
| `*` | Same as `onStartupFinished`. |
| `onCommand:<commandId>` | The first time that command runs. |
| `onView:<viewId>` | The first time that view opens. |

- **Startup extensions restart on use.** An `onStartupFinished` or `*` extension can also be started by any of its own commands or views, so it recovers from a crash without an app restart.
- **Lazy extensions start only for declared events.** Their contributions start nothing unless they are named in `activationEvents`.
- **Declared events must exist.** Every activation event must name a command or view this manifest contributes.
- **The runtime outlives its views.** Once running, it stays up until Agent Code quits or the extension is updated or removed. Closing the last view does not stop it.

### Commands

Commands appear in the command palette and can have keybindings.

- **Opening views:** a command whose id equals a view id opens that view, and so does `<extensionId>.open` when the extension has exactly one view. The host does this for you.
- **Other commands** call the handler the runtime registered with `registerCommand`. The handler's return value or thrown error is reported back to the caller. A command that exceeds the 30-second invocation deadline is not retried; its outcome is unknown and the runtime is restarted.

### Views

A view is declared with a `mount` of `modal` (floating dialog) or `panel` (a pane in the grid or Dispatch), and its own `entry` module.

- **Mounting:** before `mount(element, context)` runs, the view has attached to the runtime and received theme tokens.
- **Cleanup:** `mount` is synchronous. Return a cleanup function; it runs when the view closes.
- **Instances:** several instances of one view can be open at once, in different windows too. They share whatever the runtime publishes.

## API reference

### Runtime context

Passed to `activate(context)` in the module you export with `defineRuntime`.

| Member | Description |
| --- | --- |
| `api` | Host API available to runtimes; see [Host API](#host-api). |
| `registerCommand(id, handler)` | Handle a contributed command. `handler()` may return JSON or nothing. Returns a disposable. |
| `registerRequest(name, handler)` | Answer `context.runtime.request(name, input)` from views. `handler(input, view)` gets the JSON input and the caller's `{ id, instanceId }`; validate the input yourself. Returns a disposable. |
| `views.publish(viewId, state)` | Replace the latest JSON state for a view id. Every open instance receives it, and later instances read it on open. |
| `subscriptions` | Push disposables here; they are disposed when the runtime shuts down. |

The module may also export `deactivate()`. Shutdown allows 500 ms for `deactivate` and your subscriptions, and API calls no longer work at that point. Save state when it changes, not on shutdown.

### View context

Passed to `mount(element, context)` in the module you export with `defineView`.

| Member | Description |
| --- | --- |
| `api` | Host API available to views; see [Host API](#host-api). |
| `view` | This instance's `{ id, instanceId }`. |
| `runtime.state()` | Latest published state, or `undefined` before the first publish. |
| `runtime.subscribe(listener)` | Receive later publishes. Returns an unsubscribe function. Read `state()` first for the current value. |
| `runtime.request(name, input?)` | Call a runtime `registerRequest` handler. Resolves with its JSON result. Closing the view rejects pending requests. |

### Host API

`context.api` in runtimes and views. Calls return promises.

| Call | Runtime | View | Permission |
| --- | :-: | :-: | --- |
| `extension.id`, `extension.apiVersion` | ✓ | ✓ | none |
| `storage.get(key)`, `set(key, value)`, `delete(key)`, `keys()` | ✓ | ✓ | none |
| `secrets.get(key)`, `set(key, value)`, `delete(key)` | ✓ | ✓ | none (API v2) |
| `net.fetch(url, init)` | ✓ | ✓ | `net.connect` (private IPs) or `net.origins` (declared origins) |
| `services.start/stop/status/invoke(id, …)` | ✓ | ✓ | `service.run` |
| `services.expose(id, lan)` | ✓ | ✓ | `net.listen` |
| `files.readText({ sessionId, path })` | ✓ | ✓ | `fs.read` |
| `files.writeText({ sessionId, path, text, expectedVersion })` | ✓ | ✓ | `fs.write` |
| `notifications.show(message)` | ✓ | ✓ | `notifications.show` |
| `ui.close()` |  | ✓ | none |
| `ui.showToast(message)` |  | ✓ | none |
| `theme.tokens()` |  | ✓ | none |
| `workspace.observe()`, `workspace.subscribe(listener)` |  | ✓ | `workspace.observe` |
| `sessions.observe()`, `sessions.subscribe(listener)` |  | ✓ | `sessions.observe` |
| `panes.observe()`, `panes.subscribe(listener)` |  | ✓ | `panes.observe` |

A runtime has no UI, focus or theme of its own. Views pass it what it needs, such as a session id, through requests.

**Storage.** A durable JSON key-value store per extension:
- `get` resolves `undefined` for a missing key.
- Data survives updates and uninstall, and a reinstall with the same id sees it again.
- Browser `localStorage` and cookies are cleared and are not persistent.

**Files.** Read and write UTF-8 text inside a live session's project.
- **Targets:** `sessionId` names the session, and Agent Code resolves its project directory. `path` must be relative and cannot escape through `..` or symlinks. There is no implicit "current" project, because focus can change while a call is pending.
- **Session ids** come from `sessions.observe()` in a view.
- **`readText`** returns `{ sessionId, path, text, size, mtimeMs, version }` and accepts files up to 96 KiB.
- **`writeText`** is atomic and accepts text up to 64 KiB. Pass `expectedVersion: null` to create a file that must not exist yet, or the `version` from your last read to replace it. A write against a changed file is rejected rather than overwriting newer content.

**Secrets.** For credentials such as an API key; not a second `storage`:
- The host encrypts each value with the OS keychain (Electron `safeStorage`). If the OS cannot encrypt, `set` rejects: there is no plaintext fallback.
- Scoped to your extension id; `get` resolves `null` when absent or no longer decryptable (for example after a keychain reset).
- Deleted on uninstall, unlike `storage`.
- Keys are 1–64 characters of `[a-zA-Z0-9._-]`, values 1–4096 characters, at most 32 keys.
- The host never logs values or puts them in error messages. Do not put them in toasts, errors or `storage` yourself.

**Network.** `net.fetch(url, { httpMethod, headers, body, responseType })` asks the host to fetch; the sandbox has no network of its own.
- Private/loopback IP literals need `net.connect`. The exact HTTPS origins in your manifest's `networkOrigins` need `net.origins`. Anything else is refused.
- The verb field is `httpMethod`. Bodies are strings up to 64 KiB; responses are capped at 256 KiB (the host stops reading at the cap); redirects are refused.
- Both limits are fixed host limits, not per-call options. They exist because every result crosses a bounded transport. A **background runtime** receives results through a JSON channel of at most 128 Ki characters. So there, a `base64` body above about 96 KiB is refused with "exceeds the JSON limits". A view receives up to the full 256 KiB. Fetch large binaries from a view, or split them.
- Headers the host uses to identify callers (`x-agent-code-transport`, `forwarded`, `x-forwarded-*`) are refused on every `net.fetch`.
- The result is `{ status, contentType, body, bodyEncoding }`. Pass `responseType: 'base64'` for binary bodies and check `bodyEncoding`: hosts older than this release ignore `responseType` and return text.

**Notifications.** `notifications.show(message)` shows an in-app toast in every Agent Code window, prefixed with your extension's name. Messages are at most 200 characters. This is the way to report background work while no view is open. It is not an OS notification.

**UI.** `ui.close()` closes the pane or modal hosting this view. `ui.showToast(message)` shows a transient in-app toast.

**Theme.** View documents receive Agent Code's `--theme-*` CSS custom properties, which update on theme changes, so prefer `var(--theme-surface)` and similar in CSS. `theme.tokens()` returns the same values as an object for canvas or SVG drawing.

**Observation.** Read-only snapshots of Agent Code state:
- `workspace.observe()` → `{ activeTabId, tabIds, sessionCount }`
- `sessions.observe()` → `[{ id, kind, cwd, title }]`
- `panes.observe()` → `[{ tabId, leafSessionIds }]`

Each `subscribe` listener fires when the data changes. Call `observe()` again to read it.

## Permissions

Permissions are declared in `permissions`. Agent Code asks the user to approve them when the extension is installed or updated. An extension with no permissions installs without a prompt.

| Permission | Allows | API versions |
| --- | --- | --- |
| `workspace.observe` | `workspace.observe/subscribe` in views | 1, 2 |
| `sessions.observe` | `sessions.observe/subscribe` in views | 1, 2 |
| `panes.observe` | `panes.observe/subscribe` in views | 1, 2 |
| `fs.read` | `files.readText` | 2 |
| `fs.write` | `files.writeText` | 2 |
| `notifications.show` | `notifications.show` | 2 |
| `service.run` | `services.start/stop/status/invoke` for `contributes.services` | 2 |
| `service.transport` | `fetch('./__service/<id>/…')` to your own running service | 2 |
| `net.listen` | `services.expose(id, true)` | 2 |
| `net.connect` | `net.fetch` to private/loopback IP literals | 2 |
| `net.origins` | `net.fetch` to the exact origins in `networkOrigins`; the consent dialog lists them | 2 |

Unknown permissions fail installation. Transcript, Git and prompt access are not available.

## Manifest reference

| Field | Rules |
| --- | --- |
| `id` | `^[a-z][a-z0-9-]{0,63}$`. Also the storage namespace. |
| `name` | 1–80 characters. |
| `description` | 1–400 characters. |
| `version` | 1–40 characters, shown to users. |
| `apiVersion` | `2` (or `1` for legacy extensions). |
| `entry` | Relative path to the built runtime module (`.js` or `.mjs`), inside the repository. |
| `keywords` | Up to 24, each at most 40 characters. |
| `activationEvents` | Up to 32; see [Activation](#activation). |
| `permissions` | Up to 16; see [Permissions](#permissions). |
| `networkOrigins` | API v2, with `net.origins` (and only with it). 1–4 exact origins such as `"https://api.example.com"`: https only, a public DNS name, no wildcard, path, trailing slash, query, credentials, IP literal, `localhost` or `.local`. |
| `contributes` | Commands, views, settings, keybindings and themes, below. |

Contribution ids must start with your extension id and a dot, such as `counter.increment`. Ids must be unique within a manifest.

**Commands** (up to 64): `{ id, title, description?, keywords? }`. The title is at most 80 characters, and the description at most 400.

**Views** (up to 16): `{ id, title, mount: "modal" | "panel", entry }`. `entry` is required in API v2 and names the built view module.

**Settings** (up to 64): `{ id, title, description?, type, default }`, where `type` is `boolean`, `number` or `string`.
- Settings appear on the extension's Settings page.
- The value is stored in extension storage under the setting id.
- Read it with `api.storage.get(id)`, and fall back to `default` when it is unset.
- There is no change event, so read the value when you need it.

**Keybindings** (up to 32): `{ command, key }`.
- `command` must be a command this manifest contributes.
- `key` must be a single chord that includes Cmd, such as `cmd+shift+t`. Installation rejects bare keys and chords without Cmd.
- Chords Agent Code already uses are ignored: its built-in shortcuts, Cmd+0–9, Cmd+Alt+0–9, Cmd+Left/Right, and standard editing and app chords (Cmd+A, C, V, X, Z, Shift+Z, Q, H, Alt+H, M, W, Shift+W, comma, `=`, `-`).
- Users can rebind any command in Settings.

**Themes** (up to 16): `{ id, title, colors }`.
- Themes appear in the appearance picker without running extension code.
- `colors` maps keys from `EXTENSION_THEME_COLOR_KEYS` (81 tokens such as `canvas`, `surface`, `ink`, `accent`) to `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA` or `transparent`, with at least one color. Omitted colors use Agent Code's defaults.
- Updating the extension replaces its palette. Removing it falls back to the Dark theme, and reinstalling restores the selection.

Type your manifest with `satisfies ExtensionManifest` to catch most of these rules at compile time. Length limits and cross-references are checked only at install.

## Build and publish

`extensionViteConfig(options)` returns a Vite config:

- **v2:** `entries: { runtime: 'src/runtime.ts', view: 'src/view.ts' }` emits `dist/runtime.js` and `dist/view.js`, plus shared chunks.
- **Legacy:** `entry` and `fileName` build a single v1 module. Don't combine them with `entries`.

The preset bundles your dependencies and uses production React and JSX, so builds work whatever `NODE_ENV` your shell sets. For React, spread the whole preset and add the plugin, rather than copying selected keys:

```ts
export default { ...extensionViteConfig({ entries }), plugins: [react()] }
```

Views are not given your CSS files automatically. Import styles with `?inline` and inject a `<style>` element from the view, or style in JavaScript. Author packages should be ESM (`"type": "module"`).

Agent Code installs an extension from its GitHub repository:

- **Source:** it downloads the source of the **latest GitHub release**, or the default branch when the repository has no releases. Commit `dist/` and publish a release for each version you want users to get.
- **Size:** a bundle may be at most 32 MB to download and, once extracted, 64 MB, 10,000 files and 32 directory levels deep.
- **Updates:** **Update** reinstalls from the same repository. An extension with the same id from a different source is refused until the installed one is removed.
- **Local development:** use **Load extension from folder**, then **Reload** after rebuilding.

## Limits

| Resource | Limit |
| --- | --- |
| JSON values (requests, results, published state, storage values) | 4,096 values, depth 32, 128 KiB of text |
| Runtime startup | 10 s |
| Command or request | 30 s |
| Pending calls per extension | 32 |
| Shutdown (`deactivate` and subscriptions) | 500 ms |
| API messages from a runtime | bursts of 128, refilling at about 128 per second |
| Storage | 256 keys and 1 MiB per extension; 32 queued operations per extension, 256 overall |
| File read / write | 96 KiB / 64 KiB |
| Notification message | 200 characters |
| Open views per window | 32 |

Values that exceed a limit are rejected without replacing earlier data. Saved storage files that are corrupt or unreadable are kept as they are and reported as errors.

## API v1 compatibility

API v1 extensions use `defineExtension({ activate(context) })` and register views with `context.registerView(id, mount)`. Their module runs separately inside each open view, so there is no shared background state. v1 can use storage, UI, theme and the three observe permissions, but not files or notifications.

To migrate to v2:
1. Move commands and shared state into `defineRuntime`.
2. Move DOM code into `defineView`.
3. Give each view an `entry`.
4. Set `apiVersion: 2` and declare `activationEvents`.

## Developing this package

`npm test` builds the SDK, type-checks the example extension in `examples/counter`, and builds it through the Vite preset. CI also checks that rebuilding leaves the committed `dist/` unchanged.
