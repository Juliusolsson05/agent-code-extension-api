export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
export type ExtensionWorkspaceSnapshot = {
    activeTabId: string | null;
    tabIds: string[];
    sessionCount: number;
};
export type ExtensionSessionSnapshot = {
    id: string;
    /** Provider / terminal / extension-view kind, or null if unset. */
    kind: string | null;
    cwd: string;
    title: string | null;
};
export type ExtensionPaneSnapshot = {
    tabId: string;
    /** Session ids of the leaves in this tab's tile tree, in tree order. */
    leafSessionIds: string[];
};
export interface AgentCodeApiV1 {
    readonly extension: {
        /** This extension's id — its manifest id and storage namespace. */
        readonly id: string;
        readonly apiVersion: 1;
    };
    readonly storage: {
        get<T extends JsonValue>(key: string): Promise<T | undefined>;
        set(key: string, value: JsonValue): Promise<void>;
        delete(key: string): Promise<void>;
        keys(): Promise<string[]>;
    };
    readonly ui: {
        /** Close this extension's view (the pane or modal hosting it). */
        close(): Promise<void>;
        /** A transient app-wide toast. Not an OS notification — that is a gated
         *  capability, not part of Tier 0. */
        showToast(message: string): Promise<void>;
    };
    readonly theme: {
        /** Resolved `--theme-*` custom properties, e.g. `{ '--theme-surface': '#111113' }`.
         *  Prefer plain CSS `var(--theme-surface)` where you can; this is for canvas /
         *  inline-SVG / chart consumers that cannot use the cascade. The host also
         *  pushes fresh tokens into the frame on every theme change. */
        tokens(): Promise<Record<string, string>>;
    };
    readonly workspace: {
        /** Point-in-time workspace shape. Requires `workspace.observe`. */
        observe(): Promise<ExtensionWorkspaceSnapshot>;
        /** Fire on any workspace change; returns an unsubscribe. Re-read via observe(). */
        subscribe(listener: () => void): () => void;
    };
    readonly sessions: {
        /** All sessions' identity/shape. Requires `sessions.observe`. */
        observe(): Promise<ExtensionSessionSnapshot[]>;
        /** Fire on any session change; returns an unsubscribe. Re-read via observe(). */
        subscribe(listener: () => void): () => void;
    };
    readonly panes: {
        /** The tile layout as leaf ids per tab. Requires `panes.observe`. */
        observe(): Promise<ExtensionPaneSnapshot[]>;
        /** Fire on any pane-layout change; returns an unsubscribe. Re-read via observe(). */
        subscribe(listener: () => void): () => void;
    };
}
