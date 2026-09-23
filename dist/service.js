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
export const TRANSPORT_ATTESTATION_HEADER = 'x-agent-code-transport';
/** The values the host sets in {@link TRANSPORT_ATTESTATION_HEADER}. */
export const TRANSPORT_ATTESTATION = {
    /** Through the service.transport proxy, from this extension's own view or runtime. */
    service: 'service',
    /** Through the net.listen LAN listener, from a local-network peer. */
    lan: 'lan',
};
/** Identity helper for authoring ergonomics — a pure type gate, like
 *  defineExtension/defineRuntime. */
export function defineService(module) {
    return module;
}
const errorText = (error) => String(error?.message ?? error).slice(0, 2000);
/** Wire a ServiceModule to the host. Idempotent per process; call once at the
 *  entry's top level. Throws when not run inside an Agent Code service process
 *  (no parentPort) so local `node entry.js` fails loudly instead of hanging. */
export function runService(module) {
    // Reach parentPort through globalThis rather than the bare `process`
    // identifier: this package deliberately ships without @types/node, and a
    // module-local `declare const process` would lie about the global shape for
    // every consumer that bundles this file into a browser context.
    const port = globalThis.process?.parentPort;
    if (!port)
        throw new Error('runService() requires an Agent Code service process (process.parentPort).');
    const handlers = new Map();
    let ready = false;
    let stopping = false;
    const context = {
        ready(endpoints) {
            if (ready || stopping)
                return;
            ready = true;
            port.postMessage({ kind: 'ready', ...(endpoints?.length ? { endpoints } : {}) });
        },
        onRequest(name, handler) {
            if (!/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(name))
                throw new Error(`Invalid service request name: ${name}`);
            handlers.set(name, handler);
            return { dispose: () => { if (handlers.get(name) === handler)
                    handlers.delete(name); } };
        },
        log: line => { port.postMessage({ kind: 'log', line: String(line).slice(0, 2000) }); },
    };
    port.on('message', ({ data }) => {
        const message = data;
        if (!message || typeof message.kind !== 'string')
            return;
        if (message.kind === 'request' && typeof message.id === 'string' && typeof message.name === 'string') {
            // Capture into consts: property narrowing does not survive into the
            // async closure, and the reply must echo the exact id it was asked for.
            const { id, name, params } = message;
            void (async () => {
                const handler = handlers.get(name);
                try {
                    if (!handler)
                        throw new Error(`No service handler registered for ${name}`);
                    // The host already bounded this payload; the child re-checks the two
                    // fields it depends on and never trusts more than it uses.
                    const value = await handler(params);
                    if (!stopping)
                        port.postMessage({ kind: 'result', id, ok: true, ...(value === undefined ? {} : { value }) });
                }
                catch (error) {
                    if (!stopping)
                        port.postMessage({ kind: 'result', id, ok: false, error: errorText(error) });
                }
            })();
            return;
        }
        if (message.kind === 'shutdown' && typeof message.id === 'string') {
            const { id } = message;
            stopping = true;
            void (async () => {
                try {
                    await module.stop?.();
                }
                catch { /* best effort */ }
                port.postMessage({ kind: 'stopped', id });
            })();
        }
    });
    void Promise.resolve(module.start(context)).catch(error => {
        // start() failing after ready() is unreportable on this channel by design;
        // surface it as a log so the failure is at least visible in host logs.
        context.log(`service start failed: ${errorText(error)}`);
    });
}
