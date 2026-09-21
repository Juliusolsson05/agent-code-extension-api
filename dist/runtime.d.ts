import type { AgentCodeApiV1, ExtensionFilesApi, ExtensionNotificationsApi, ExtensionServicesApi, ExtensionNetApi, JsonValue } from './api.js';
export type RuntimeDisposable = {
    dispose(): void | Promise<void>;
};
export type RuntimeViewIdentity = {
    readonly id: string;
    readonly instanceId: string;
};
export type RuntimeApiV2 = {
    readonly extension: {
        readonly id: string;
        readonly apiVersion: 2;
    };
    readonly storage: AgentCodeApiV1['storage'];
    readonly files: ExtensionFilesApi;
    readonly notifications: ExtensionNotificationsApi;
    readonly services: ExtensionServicesApi;
    readonly net: ExtensionNetApi;
};
export type RuntimeContext = {
    readonly api: RuntimeApiV2;
    readonly subscriptions: RuntimeDisposable[];
    registerCommand(id: string, handler: () => JsonValue | void | Promise<JsonValue | void>): RuntimeDisposable;
    registerRequest(name: string, handler: (input: JsonValue, view: RuntimeViewIdentity) => JsonValue | void | Promise<JsonValue | void>): RuntimeDisposable;
    readonly views: {
        publish(viewId: string, state: JsonValue): Promise<void>;
    };
};
export type RuntimeModule = {
    activate(context: RuntimeContext): void | Promise<void>;
    /** Best effort, with a host deadline. Persist state on mutation, not here. */
    deactivate?(): void | Promise<void>;
};
export type ViewContext<State extends JsonValue = JsonValue> = {
    readonly api: Omit<AgentCodeApiV1, 'extension'> & {
        readonly extension: {
            readonly id: string;
            readonly apiVersion: 2;
        };
        readonly files: ExtensionFilesApi;
        readonly notifications: ExtensionNotificationsApi;
        readonly services: ExtensionServicesApi;
        readonly net: ExtensionNetApi;
    };
    readonly view: RuntimeViewIdentity;
    readonly runtime: {
        /** Latest published state; undefined until the runtime first publishes. */
        state(): State | undefined;
        request<Result extends JsonValue = JsonValue>(name: string, input?: JsonValue): Promise<Result | undefined>;
        /** Receives later publications. Read state() for the initial snapshot. */
        subscribe(listener: (state: State) => void): () => void;
    };
};
export type ViewModule<State extends JsonValue = JsonValue> = {
    mount(element: HTMLElement, context: ViewContext<State>): void | (() => void);
};
export declare function defineRuntime(module: RuntimeModule): RuntimeModule;
export declare function defineView<State extends JsonValue = JsonValue>(module: ViewModule<State>): ViewModule<State>;
