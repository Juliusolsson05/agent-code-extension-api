export type ExtensionViewMount = 'modal' | 'panel';
export type ExtensionCommandContribution = {
    /** Must be namespaced `<extensionId>.` */
    id: string;
    title: string;
    description?: string;
    keywords?: string[];
};
export type ExtensionViewContribution = {
    id: string;
    title: string;
    mount: ExtensionViewMount;
};
export type ExtensionSettingContribution = {
    id: string;
    title: string;
    description?: string;
    type: 'boolean';
    default: boolean;
} | {
    id: string;
    title: string;
    description?: string;
    type: 'number';
    default: number;
} | {
    id: string;
    title: string;
    description?: string;
    type: 'string';
    default: string;
};
export type ExtensionKeybindingContribution = {
    command: string;
    /** Accelerator, e.g. `cmd+shift+t`. Consulted after every first-party binding. */
    key: string;
};
export type ExtensionContributions = {
    commands?: ExtensionCommandContribution[];
    views?: ExtensionViewContribution[];
    settings?: ExtensionSettingContribution[];
    keybindings?: ExtensionKeybindingContribution[];
};
/**
 * A power requested beyond the always-granted Tier-0 API. Granted at install.
 *
 * ── THIS LIST MUST MATCH WHAT THE HOST IMPLEMENTS, NOT WHAT IT PLANS TO ──
 * It previously also declared fs.read, transcript.read, git.read, sessions.prompt,
 * fs.write, git.commit and network.fetch. None of them were implemented anywhere:
 * no request method could carry them, no broker arm performed them, and the host
 * now REFUSES to install a manifest that asks for one.
 *
 * Keeping them here was worse than useless. This package exists so an author gets
 * a type error instead of a runtime surprise — and it delivered the exact opposite:
 * `permissions: ['fs.write']` type-checked cleanly and then failed the install.
 * A capability belongs in this union only once the host can actually perform it.
 */
export type ExtensionCapability = 'workspace.observe' | 'sessions.observe' | 'panes.observe';
export type ExtensionActivationEvent = 'onStartupFinished' | '*' | `onCommand:${string}` | `onView:${string}`;
export type ExtensionManifest = {
    id: string;
    name: string;
    description: string;
    version: string;
    /** Which AgentCodeApi major this targets. The host refuses a manifest whose
     *  apiVersion it does not implement. */
    apiVersion: 1;
    /** Relative path of the built ES module. Must stay inside the bundle. */
    entry: string;
    keywords?: string[];
    activationEvents?: ExtensionActivationEvent[];
    contributes?: ExtensionContributions;
    permissions?: ExtensionCapability[];
};
