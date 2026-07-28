export type ExtensionViteOptions = {
    /** Entry module path. Default: 'src/index.ts'. Must match manifest `entry` once built. */
    entry?: string;
    /** Output file name (no extension). Default: 'index' -> dist/index.js. */
    fileName?: string;
};
/** A plain object matching Vite's `UserConfig` shape — returned untyped so this
 *  package need not depend on vite. Spread/return it from vite.config.ts. */
export declare function extensionViteConfig(options?: ExtensionViteOptions): Record<string, unknown>;
