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
// bootstrap). Tier 0 — storage/ui/theme — needs no permission; the observe groups
// below are Tier 1, each gated behind a declared manifest capability granted at
// install (the broker rejects an ungranted call).

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

// --- Tier-1 observe snapshots ------------------------------------------------
// Curated, fully-serializable projections of host state — never the live objects,
// which carry renderer-only handles. Point-in-time reads; live updates arrive via
// the matching subscribe() (the host pushes a change nudge, you re-read).

export type ExtensionWorkspaceSnapshot = {
  activeTabId: string | null
  tabIds: string[]
  sessionCount: number
}

export type ExtensionSessionSnapshot = {
  id: string
  /** Provider / terminal / extension-view kind, or null if unset. */
  kind: string | null
  cwd: string
  title: string | null
}

export type ExtensionPaneSnapshot = {
  tabId: string
  /** Session ids of the leaves in this tab's tile tree, in tree order. */
  leafSessionIds: string[]
}

export type ExtensionTextFile = {
  sessionId: string
  /** Normalized project-relative path; the host never returns the root here. */
  path: string
  text: string
  size: number
  mtimeMs: number
  /** Opaque compare-and-swap token accepted by writeText. */
  version: string
}

export type ExtensionTextFileWrite = {
  sessionId: string
  path: string
  size: number
  mtimeMs: number
  /** The next opaque token required to replace this version. */
  version: string
}

export type ExtensionFilesApi = {
  /**
   * Read a bounded UTF-8 file in a live session's project. Requires `fs.read`.
   * The explicit target is required even in a view: focus can change while an
   * asynchronous request is pending, and background runtimes have no focus.
   */
  readText(options: { sessionId: string; path: string }): Promise<ExtensionTextFile>

  /**
   * Atomically create or replace a UTF-8 file up to 64 KiB. Requires `fs.write`.
   * null creates only; replacing requires the version returned by readText.
   */
  writeText(options: {
    sessionId: string
    path: string
    text: string
    expectedVersion: string | null
  }): Promise<ExtensionTextFileWrite>
}

export type ExtensionNotificationsApi = {
  /**
   * Show a short app-wide status toast. Requires `notifications.show`.
   * The host attributes the message to this extension; it is not an OS alert.
   */
  show(message: string): Promise<void>
}

/** Live status of a declared service. `pid` is diagnostics only. */
export type ExtensionServiceHandle = {
  state: 'running'
  serviceId: string
  pid: number
  /** Loopback endpoints the service reported at ready(). */
  endpoints: Array<{ name: string; port: number }>
}

export type ExtensionServiceStatus =
  | { state: 'stopped'; serviceId: string }
  | ExtensionServiceHandle

export type ExtensionServicesApi = {
  /**
   * Start a declared service (`contributes.services`). Requires `service.run`.
   * This is the only call that can launch native code; it resolves once the
   * service reported ready, with its pid and any loopback endpoints.
   */
  start(serviceId: string): Promise<ExtensionServiceHandle>
  /** Stop a running service (idempotent). Requires `service.run`. */
  stop(serviceId: string): Promise<void>
  /** Current status without starting anything. Requires `service.run`. */
  status(serviceId: string): Promise<ExtensionServiceStatus>
  /**
   * Call a named handler registered by the service (see runService). Requires
   * `service.run` and a prior start(). Bounded JSON in and out.
   */
  invoke(serviceId: string, name: string, params?: JsonValue): Promise<JsonValue | undefined>
  /**
   * Make a running service reachable from this machine's local network.
   * Requires `net.listen` separate from `service.run`: the HOST binds the LAN
   * listener (OS-chosen port in the reply) and reverse-proxies to the service's
   * loopback endpoint; the listener closes when the service stops or you pass
   * lan:false. Share the returned port on a trusted network only.
   */
  expose(serviceId: string, lan: boolean): Promise<ExtensionServiceExposure>
}

export type ExtensionServiceExposure =
  | { serviceId: string; lan: false }
  | { serviceId: string; lan: true; port: number }

export type NetFetchInit = {
  httpMethod?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Array<{ name: string; value: string }>
  body?: string
  /**
   * 'base64' returns the raw response bytes base64-encoded — use it for audio,
   * images or any binary body (text decoding would corrupt them). Default
   * 'text'. Hosts older than Agent Code ≥ the first supporting version ignore
   * this field; check `bodyEncoding` on the result.
   */
  responseType?: 'text' | 'base64'
}

export type NetFetchResult = {
  status: number
  contentType: string
  body: string
  /** What the host actually returned. Absent only from hosts older than
   *  Agent Code ≥ the first supporting version. */
  bodyEncoding?: 'text' | 'base64'
}

export type ExtensionNetApi = {
  /**
   * Brokered outbound fetch. The sandbox never opens a socket — the host checks
   * the target and performs the request. Two targets exist:
   * - literal private/loopback IP hosts (e.g. `http://192.168.1.42:5192/`),
   *   requiring `net.connect`;
   * - the exact HTTPS origins listed in the manifest's `networkOrigins`,
   *   requiring `net.origins`.
   * Anything else is refused. Redirects are refused, request bodies are capped
   * at 64 KiB and responses at 256 KiB, and header values never appear in host
   * errors or logs.
   *
   * Timeouts are fixed host limits, not per-call options: the host aborts a
   * request to a private address after 10 s and one to a declared origin after
   * 15 s (a public API crosses the internet; a LAN peer should answer fast),
   * and the promise rejects with a "timed out" error.
   */
  fetch(url: string, init?: NetFetchInit): Promise<NetFetchResult>
}

/**
 * Per-extension credentials (API v2, no permission; Agent Code ≥ the first
 * supporting version). Encrypted by the OS
 * keychain through the host (Electron safeStorage); scoped to this extension's
 * id; deleted on uninstall. `set` rejects when the OS cannot encrypt — there
 * is no plaintext fallback. Keys: 1–64 chars of [a-zA-Z0-9._-]; values:
 * 1–4096 characters; at most 32 keys.
 *
 * FEATURE-DETECT IT: `api.secrets` is optional on every API-v2 context because
 * older API-v2 hosts do not provide it, and a secrets-only extension requests no
 * permission, so an older host still loads the extension. Guard with
 * `if (context.api.secrets)` and never fall back to `storage` for a credential.
 * Invalid arguments reject.
 */
export type ExtensionSecretsApi = {
  /** The stored value, or null when absent or no longer decryptable. */
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * With the `service.transport` permission, a view (or runtime) may also speak
 * HTTP to its OWN running service through the host proxy — no other network is
 * reachable. Fetch a path on the frame's own origin; the host dials the
 * service's loopback endpoint:
 *
 *   fetch(`./__service/${serviceId}/api/state`)        // from a view frame
 *
 * Plain methods only (GET/HEAD/POST/PUT/DELETE/PATCH); WebSockets are not
 * proxied. A service that is not running answers 404.
 */

export interface AgentCodeApiV1 {
  readonly extension: {
    /** This extension's id — its manifest id and storage namespace. */
    readonly id: string
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

  // --- Tier 1 — read-only metadata (capability-gated) ------------------------
  // Each requires a declared manifest permission (workspace.observe /
  // sessions.observe / panes.observe). The broker rejects the call if the grant is
  // absent, so an extension that did not request the capability never reaches these.
  // observe() is a snapshot; subscribe() fires on change — re-read via observe().

  readonly workspace: {
    /** Point-in-time workspace shape. Requires `workspace.observe`. */
    observe(): Promise<ExtensionWorkspaceSnapshot>
    /** Fire on any workspace change; returns an unsubscribe. Re-read via observe(). */
    subscribe(listener: () => void): () => void
  }

  readonly sessions: {
    /** All sessions' identity/shape. Requires `sessions.observe`. */
    observe(): Promise<ExtensionSessionSnapshot[]>
    /** Fire on any session change; returns an unsubscribe. Re-read via observe(). */
    subscribe(listener: () => void): () => void
  }

  readonly panes: {
    /** The tile layout as leaf ids per tab. Requires `panes.observe`. */
    observe(): Promise<ExtensionPaneSnapshot[]>
    /** Fire on any pane-layout change; returns an unsubscribe. Re-read via observe(). */
    subscribe(listener: () => void): () => void
  }
}
