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
    const port = process.parentPort;
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
