import type { JsonValue } from './api.js';
export type ServiceEndpoint = {
    name: string;
    port: number;
};
/** Header naming which host path delivered a request to a service. */
export declare const TRANSPORT_ATTESTATION_HEADER = "x-agent-code-transport";
/** The values the host sets in {@link TRANSPORT_ATTESTATION_HEADER}. */
export declare const TRANSPORT_ATTESTATION: {
    /** Through the service.transport proxy, from this extension's own view or runtime. */
    readonly service: "service";
    /** Through the net.listen LAN listener, from a local-network peer. */
    readonly lan: "lan";
};
export type TransportAttestation = (typeof TRANSPORT_ATTESTATION)[keyof typeof TRANSPORT_ATTESTATION];
export type ServiceRequest = {
    id: string;
    name: string;
    params?: JsonValue;
};
export type ServiceContext = {
    /** Declare initialization complete. Call exactly once; `endpoints` lists the
     *  LOOPBACK listeners you opened (bind 127.0.0.1 — the host's later exposure
     *  capabilities decide if/when anything is reachable beyond this machine). */
    ready(endpoints?: ServiceEndpoint[]): void;
    /** Register the RPC surface the extension's runtime/views reach through
     *  api.services.invoke(serviceId, name, params). */
    onRequest(name: string, handler: (params: JsonValue | undefined) => JsonValue | void | Promise<JsonValue | void>): {
        dispose(): void;
    };
    /** Best-effort diagnostics line; lands in the host's log, never host UI. */
    log(line: string): void;
};
export type ServiceModule = {
    start(context: ServiceContext): void | Promise<void>;
    /** Host shutdown notice: finish and return promptly; the host kills the
     *  process shortly after regardless. Persist on mutation, not here. */
    stop?(): void | Promise<void>;
};
/** Identity helper for authoring ergonomics — a pure type gate, like
 *  defineExtension/defineRuntime. */
export declare function defineService(module: ServiceModule): ServiceModule;
/** Wire a ServiceModule to the host. Idempotent per process; call once at the
 *  entry's top level. Throws when not run inside an Agent Code service process
 *  (no parentPort) so local `node entry.js` fails loudly instead of hanging. */
export declare function runService(module: ServiceModule): void;
