// Vite build preset for an extension.
//
// WHY a single ES module with everything inlined: the host serves an extension's
// files over a custom scheme and imports exactly one entry module into the
// extension's own frame. A code-split build would point at chunks the host never
// fetches; committed `dist/` is loaded verbatim.
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
//   import { extensionViteConfig } from 'agent-code-extension-api/vite'
//   export default extensionViteConfig()
/** A plain object matching Vite's `UserConfig` shape — returned untyped so this
 *  package need not depend on vite. Spread/return it from vite.config.ts. */
export function extensionViteConfig(options = {}) {
    const entry = options.entry ?? 'src/index.ts';
    const fileName = options.fileName ?? 'index';
    return {
        define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
        },
        build: {
            cssCodeSplit: false,
            lib: {
                entry,
                formats: ['es'],
                fileName: () => `${fileName}.js`,
            },
            rollupOptions: {
                output: { inlineDynamicImports: true },
            },
        },
    };
}
