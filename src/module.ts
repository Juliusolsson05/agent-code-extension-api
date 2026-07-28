// The extension module contract — the canonical mirror of agent-code
// src/renderer/src/apps/host/moduleContract.ts.
//
// An extension's entry module exports `activate(context)` (and optionally
// `deactivate()`). The host imports it inside the extension's own frame and calls
// activate with a context carrying the Tier-0 api plus registration functions.

import type { AgentCodeApiV1 } from './api.js'

export type Disposable = { dispose(): void }

/**
 * A view's renderer: DOM element in, optional cleanup function out.
 *
 * DOM-level on purpose — it keeps React/Preact/Svelte/canvas all viable, and it is
 * the shape that works whether the view is mounted in a modal or a grid pane. A
 * React author writes `createRoot(element).render(<App/>)` and returns
 * `() => root.unmount()`.
 */
export type ViewMount = (element: HTMLElement) => void | (() => void)

/** What `activate(context)` receives. */
export type ExtensionContext = {
  readonly api: AgentCodeApiV1
  /** Bind a handler to a contributed command id. */
  registerCommand(id: string, run: () => void | Promise<void>): Disposable
  /** Bind a renderer to a contributed view id. */
  registerView(id: string, mount: ViewMount): Disposable
  /** Disposed in reverse order when the extension deactivates. */
  readonly subscriptions: Disposable[]
}

export type ExtensionModule = {
  activate(context: ExtensionContext): void | Promise<void>
  deactivate?(): void | Promise<void>
}

/**
 * Identity helper for authoring ergonomics — write your module through this to get
 * full type-checking of `activate`/`deactivate` against the contract. Purely a
 * type gate; it returns the module unchanged.
 *
 *   export default defineExtension({ activate(ctx) { ... } })
 */
export function defineExtension(module: ExtensionModule): ExtensionModule {
  return module
}
