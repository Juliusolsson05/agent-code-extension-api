# agent-code-extension-api

Types and authoring helpers for building [Agent Code](https://github.com/Juliusolsson05/agent-code) extensions.

An extension is a small GitHub repo the user installs by name. It declares what it
contributes (commands, keybindings, settings, views) in a manifest, and — for views —
ships a built ES module the host runs inside a sandboxed frame at the extension's own
origin. This package gives you the types and the build preset so you are not
hand-rolling either.

## Install

```bash
npm install --save-dev agent-code-extension-api
```

## A minimal extension

`agent-code.extension.json` (repo root):

```jsonc
{
  "id": "hello",
  "name": "Hello",
  "description": "A minimal Agent Code extension.",
  "version": "0.1.0",
  "apiVersion": 1,
  "entry": "dist/index.js",
  "activationEvents": ["onView:hello.main"],
  "contributes": {
    "commands": [{ "id": "hello.open", "title": "Hello: Open" }],
    "views": [{ "id": "hello.main", "title": "Hello", "mount": "modal" }],
    "keybindings": [{ "command": "hello.open", "key": "cmd+shift+h" }],
    "settings": [{ "id": "hello.loud", "title": "Loud mode", "type": "boolean", "default": false }]
  }
}
```

`src/index.ts`:

```ts
import { defineExtension } from 'agent-code-extension-api'

export const { activate, deactivate } = defineExtension({
  activate(ctx) {
    ctx.registerView('hello.main', (element) => {
      element.textContent = 'Hello from an extension'
      // Tier-0 API is available immediately, no permission needed:
      void ctx.api.ui.showToast('Hello activated')
      return () => { element.textContent = '' } // optional cleanup
    })
  },
})
```

`vite.config.ts`:

```ts
import { extensionViteConfig } from 'agent-code-extension-api'
export default extensionViteConfig()
```

## Build and publish

```bash
npm run build          # produces dist/index.js
git add dist && git commit -m "build"   # dist MUST be committed
git push
```

The installer downloads your repo's **source** tarball, so a CI-only `dist/` means
"manifest points at a file that does not exist". Commit `dist/`.

Then in Agent Code: **Settings → Extensions**, paste `your-name/your-repo`, Install.

## What you get

- `AgentCodeApiV1` — the Tier-0 host API (`storage`, `ui`, `theme`), all async.
- `defineExtension`, `ExtensionModule`, `ExtensionContext`, `ViewMount` — the module contract.
- `ExtensionManifest` and the contribution/capability types — type-check your manifest with `satisfies ExtensionManifest`.
- `extensionViteConfig()` — the one build preset that gets the details right (single
  inlined ES module, `process.env.NODE_ENV` defined, no CSS code-split).

## Capabilities

Everything above is Tier 0 — granted to every extension, no prompt. Anything more
(`fs.read`, `sessions.prompt`, `network.fetch`, …) is declared in `permissions` and
the user grants it at install. Request only what you use.

## Note on the API surface

The canonical definitions live in the Agent Code app; these types mirror them so you
don't depend on the app's source. If they ever disagree, the app wins.
