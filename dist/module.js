// The extension module contract — the canonical mirror of agent-code
// src/renderer/src/apps/host/moduleContract.ts.
//
// An extension's entry module exports `activate(context)` (and optionally
// `deactivate()`). The host imports it inside the extension's own frame and calls
// activate with a context carrying the Tier-0 api plus registration functions.
/**
 * Identity helper for authoring ergonomics — write your module through this to get
 * full type-checking of `activate`/`deactivate` against the contract. Purely a
 * type gate; it returns the module unchanged.
 *
 *   export default defineExtension({ activate(ctx) { ... } })
 */
export function defineExtension(module) {
    return module;
}
