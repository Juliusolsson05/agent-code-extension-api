import type { JsonValue } from './api.js'

// The service-module contract: what a bundled native entry (`contributes.services
// [] → entry`) exports. The host forks it as an Electron utilityProcess and
// speaks a small message protocol over process.parentPort:
//
//   service → host  { kind: 'ready', endpoints?: [{ name, port }] }
//                   { kind: 'result', id, ok: true|false, value?|error }
//                   { kind: 'stopped', id }
//                   { kind: 'log', line }
//   host → service  { kind: 'request', id, name, params? }
//                   { kind: 'shutdown', id }
//
// `runService` below implements the child side of that wire, so an author never
// touches the protocol directly: export defineService({...}), call
// runService(module) at the entry top level, done.
//
// TRUST MODEL (mirrors the install dialog): a service is native code with the
// user's privileges. Nothing here sandboxes it — the `service.run` grant is the
// user's consent decision, and the host's lifecycle/proxy conveniences are what
// it gates.

export type ServiceEndpoint = { name: string; port: number }

// ── TRANSPORT ATTESTATION ──
// The host SETS this header on every request it delivers to a service's
// loopback endpoint, and never copies a caller's own value through:
//
//   'service' → the `service.transport` proxy: the owning extension's own view
//               or runtime (grant and running-state checks already passed).
//               Same principal as the service; treat it like your own page.
//   'lan'     → the `net.listen` LAN listener: a guest on the local network.
//               The listener also sets `x-forwarded-for` (the peer address) and
//               `x-forwarded-host` (the Host the peer used). Treat the request
//               as that remote peer, never as local.
//
// WHY IT IS EXPORTED: it is a wire contract between the host and every service
// that tells its own frame apart from LAN guests. Before this export each
// service hard-coded the string, and nothing tied the two sides together.
//
// HOW TO TRUST IT (the header alone proves nothing):
// - Only on a request that arrived on your LOOPBACK socket. Any process on the
//   machine can dial loopback and send any header, so combine it with your own
//   secret, such as a bearer token, when the distinction guards something that
//   matters.
// - Only when `Host` is exactly `127.0.0.1:<your port>`. Both host paths dial
//   that address, so a DNS-rebound browser page (which sends its own name as
//   Host) is told apart.
// - Never answer CORS preflights with permissive headers. A browser page can
//   only attach a custom header cross-origin after a preflight, and refusing it
//   is what keeps pages on other origins from forging the header.
// - Absent header: not delivered by either host path, for example another
//   local process. Apply your strictest rule.

/** Header naming which host path delivered a request to a service. */
export const TRANSPORT_ATTESTATION_HEADER = 'x-agent-code-transport'

/** The values the host sets in {@link TRANSPORT_ATTESTATION_HEADER}. */
export const TRANSPORT_ATTESTATION = {
  /** Through the service.transport proxy, from this extension's own view or runtime. */
  service: 'service',
  /** Through the net.listen LAN listener, from a local-network peer. */
  lan: 'lan',
} as const

export type TransportAttestation = (typeof TRANSPORT_ATTESTATION)[keyof typeof TRANSPORT_ATTESTATION]

export type ServiceRequest = { id: string; name: string; params?: JsonValue }

export type ServiceContext = {
  /** Declare initialization complete. Call exactly once; `endpoints` lists the
   *  LOOPBACK listeners you opened (bind 127.0.0.1 — the host's later exposure
   *  capabilities decide if/when anything is reachable beyond this machine). */
  ready(endpoints?: ServiceEndpoint[]): void
  /** Register the RPC surface the extension's runtime/views reach through
   *  api.services.invoke(serviceId, name, params). */
  onRequest(name: string, handler: (params: JsonValue | undefined) => JsonValue | void | Promise<JsonValue | void>): { dispose(): void }
  /** Best-effort diagnostics line; lands in the host's log, never host UI. */
  log(line: string): void
}

export type ServiceModule = {
  start(context: ServiceContext): void | Promise<void>
  /** Host shutdown notice: finish and return promptly; the host kills the
   *  process shortly after regardless. Persist on mutation, not here. */
  stop?(): void | Promise<void>
}

/** Identity helper for authoring ergonomics — a pure type gate, like
 *  defineExtension/defineRuntime. */
export function defineService(module: ServiceModule): ServiceModule {
  return module
}

// Minimal structural type: the SDK must stay dependency-free, and the child
// process is Electron's utilityProcess, where parentPort is always present.
type ParentPortLike = {
  on(event: 'message', listener: (event: { data: unknown }) => void): void
  postMessage(message: unknown): void
}

const errorText = (error: unknown): string => String((error as Error | undefined)?.message ?? error).slice(0, 2000)

/** Wire a ServiceModule to the host. Idempotent per process; call once at the
 *  entry's top level. Throws when not run inside an Agent Code service process
 *  (no parentPort) so local `node entry.js` fails loudly instead of hanging. */
export function runService(module: ServiceModule): void {
  // Reach parentPort through globalThis rather than the bare `process`
  // identifier: this package deliberately ships without @types/node, and a
  // module-local `declare const process` would lie about the global shape for
  // every consumer that bundles this file into a browser context.
  const port = (globalThis as { process?: { parentPort?: ParentPortLike } }).process?.parentPort
  if (!port) throw new Error('runService() requires an Agent Code service process (process.parentPort).')
  const handlers = new Map<string, (params: JsonValue | undefined) => JsonValue | void | Promise<JsonValue | void>>()
  let ready = false
  let stopping = false
  const context: ServiceContext = {
    ready(endpoints) {
      if (ready || stopping) return
      ready = true
      port.postMessage({ kind: 'ready', ...(endpoints?.length ? { endpoints } : {}) })
    },
    onRequest(name, handler) {
      if (!/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(name)) throw new Error(`Invalid service request name: ${name}`)
      handlers.set(name, handler)
      return { dispose: () => { if (handlers.get(name) === handler) handlers.delete(name) } }
    },
    log: line => { port.postMessage({ kind: 'log', line: String(line).slice(0, 2000) }) },
  }
  port.on('message', ({ data }) => {
    const message = data as { kind?: string; id?: string; name?: string; params?: JsonValue }
    if (!message || typeof message.kind !== 'string') return
    if (message.kind === 'request' && typeof message.id === 'string' && typeof message.name === 'string') {
      // Capture into consts: property narrowing does not survive into the
      // async closure, and the reply must echo the exact id it was asked for.
      const { id, name, params } = message
      void (async () => {
        const handler = handlers.get(name)
        try {
          if (!handler) throw new Error(`No service handler registered for ${name}`)
          // The host already bounded this payload; the child re-checks the two
          // fields it depends on and never trusts more than it uses.
          const value = await handler(params)
          if (!stopping) port.postMessage({ kind: 'result', id, ok: true, ...(value === undefined ? {} : { value }) })
        } catch (error) {
          if (!stopping) port.postMessage({ kind: 'result', id, ok: false, error: errorText(error) })
        }
      })()
      return
    }
    if (message.kind === 'shutdown' && typeof message.id === 'string') {
      const { id } = message
      stopping = true
      void (async () => {
        try { await module.stop?.() } catch { /* best effort */ }
        port.postMessage({ kind: 'stopped', id })
      })()
    }
  })
  void Promise.resolve(module.start(context)).catch(error => {
    // start() failing after ready() is unreportable on this channel by design;
    // surface it as a log so the failure is at least visible in host logs.
    context.log(`service start failed: ${errorText(error)}`)
  })
}
