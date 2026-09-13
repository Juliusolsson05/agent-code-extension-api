// Vite build preset for an extension.
//
// API v1 can keep a single module. API v2 needs independent runtime/view
// entries: passing closures between their isolated documents is not supported.
// The host serves every contained bundle asset, so shared chunks are valid and
// avoid duplicating dependencies across view modules.
//
// WHY the extension bundles its OWN React (no host externals, unlike the pre-frame
// model): each extension runs in its own iframe/document, so there is no shared
// React instance to collide with — the "invalid hook call from two reconcilers"
// problem does not exist across the frame boundary. Bundle React normally.
//
// WHY the NODE_ENV define: Vite library mode does not replace process.env.NODE_ENV,
// and the code loads into a renderer with no `process` global, so React-ecosystem
// dev guards throw at activate() unless it is defined at build time.
//
// Usage — vite.config.ts:
//   import { extensionViteConfig } from 'agent-code-extension-api'
//   export default extensionViteConfig()
//
// NOTE the specifier: the package exposes exactly ONE export path ("." in
// package.json), so the `/vite` subpath this comment used to name resolves to
// nothing — an author copying it got a module-not-found before their first build.
/** A plain object matching Vite's `UserConfig` shape — returned untyped so this
 *  package need not depend on vite. Spread/return it from vite.config.ts. */
export function extensionViteConfig(options = {}) {
    if (options.entries && (options.entry || options.fileName))
        throw new Error('Use entries or entry/fileName, not both');
    if (options.entries && (Object.keys(options.entries).length === 0 || Object.keys(options.entries).some(name => !/^[a-zA-Z0-9_-]+$/.test(name)))) {
        throw new Error('Entry names must be nonempty file stems containing letters, digits, underscores or hyphens');
    }
    const entry = options.entries ?? options.entry ?? 'src/index.ts';
    const fileName = options.fileName ?? 'index';
    return {
        define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
        },
        // WHY pin jsxDev: the define above selects React's PRODUCTION runtime, but
        // Vite picks the JSX transform from the shell's NODE_ENV instead
        // (`jsxDev: !isProduction`). A build run with NODE_ENV=development — the
        // documented workaround for npm dropping devDependencies under production —
        // emitted `jsxDEV` calls against a production jsx-dev-runtime whose export is
        // undefined. The bundle installed fine and then threw "jsxDEV is not a
        // function" on first render inside the sandboxed frame, where the author
        // cannot see why. Timer and Mini Games both shipped that bug before pinning
        // NODE_ENV=production in their build scripts. Vite merges this with
        // @vitejs/plugin-react's own `esbuild.jsx` setting.
        esbuild: { jsxDev: false },
        build: {
            cssCodeSplit: false,
            lib: {
                entry,
                formats: ['es'],
                fileName: (_format, name) => `${options.entries ? name : fileName}.js`,
            },
            rollupOptions: {
                output: { inlineDynamicImports: !options.entries },
            },
        },
    };
}
