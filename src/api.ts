// The Agent Code host API, version 1 — the canonical mirror.
//
// Source of truth: agent-code src/renderer/src/apps/api/types.ts. This copy exists
// so an extension author gets types WITHOUT depending on the app's source tree. If
// the two ever drift, the app wins and this file is the bug (the app's frame broker
// is what actually answers these calls).
//
// Every method returns a Promise, on purpose: an extension runs in a sandboxed
// iframe and reaches the host only over postMessage, where nothing can be
// synchronous. The runtime the host injects fulfils this shape (see the frame
// bootstrap). Tier 0 — storage/ui/theme — needs no permission; anything more is a
// declared capability granted at install.

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface AgentCodeApiV1 {
  readonly extension: {
    readonly apiVersion: 1
  }

  readonly storage: {
    get<T extends JsonValue>(key: string): Promise<T | undefined>
    set(key: string, value: JsonValue): Promise<void>
    delete(key: string): Promise<void>
    keys(): Promise<string[]>
  }

  readonly ui: {
    /** Close this extension's view (the pane or modal hosting it). */
    close(): Promise<void>
    /** A transient app-wide toast. Not an OS notification — that is a gated
     *  capability, not part of Tier 0. */
    showToast(message: string): Promise<void>
  }

  readonly theme: {
    /** Resolved `--theme-*` custom properties, e.g. `{ '--theme-surface': '#111113' }`.
     *  Prefer plain CSS `var(--theme-surface)` where you can; this is for canvas /
     *  inline-SVG / chart consumers that cannot use the cascade. The host also
     *  pushes fresh tokens into the frame on every theme change. */
    tokens(): Promise<Record<string, string>>
  }
}
