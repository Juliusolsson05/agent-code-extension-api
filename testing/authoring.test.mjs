import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { test } from 'node:test'
import { buildAuthorFixture } from './buildAuthorFixture.mjs'
import { build } from 'vite'
import { extensionViteConfig } from '../dist/index.js'

test('builds independent browser modules from the public SDK and a typed manifest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agent-code-sdk-author-'))
  try {
    const manifest = await buildAuthorFixture(root)
    assert.equal(manifest.apiVersion, 2)
    assert.deepEqual(manifest.permissions, ['fs.read', 'fs.write', 'notifications.show'])
    assert.deepEqual(manifest.contributes.themes, [{ id: 'managed.night', title: 'Counter Night', colors: { canvas: '#102030', ink: '#f0e0d0', accent: '#78abcd' } }])
    const runtime = await import(pathToFileURL(join(root, manifest.entry)).href)
    const view = await import(pathToFileURL(join(root, manifest.contributes.views[0].entry)).href)
    assert.equal(typeof runtime.default.activate, 'function')
    assert.equal(typeof view.default.mount, 'function')
    assert.equal(view.default.activate, undefined, 'a view build must not carry a second activation entry')
    for (const file of await readdir(root)) {
      if (file.endsWith('.js')) assert.doesNotMatch(await readFile(join(root, file), 'utf8'), /from\s+["']agent-code-extension-api["']/)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('emits the production JSX runtime even when the shell exports NODE_ENV=development', async () => {
  // Regression for "jsxDEV is not a function" inside the extension frame. The
  // preset bundles React's production runtime, whose jsx-dev-runtime export is
  // undefined, so a dev JSX transform installs cleanly and then crashes on first
  // render. NODE_ENV=development is exactly what authors export to keep npm from
  // dropping devDependencies, so the transform must not depend on it.
  const root = await mkdtemp(join(tmpdir(), 'agent-code-sdk-jsx-'))
  const previous = process.env.NODE_ENV
  process.env.NODE_ENV = 'development'
  try {
    await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }))
    await writeFile(join(root, 'view.jsx'), 'export const View = () => <div>hi</div>')
    const preset = extensionViteConfig({ entry: join(root, 'view.jsx'), fileName: 'view' })
    await build({ ...preset, root, configFile: false, envDir: false, logLevel: 'warn',
      // Mirrors @vitejs/plugin-react's config hook, so the preset's key is merged
      // the same way it is in a real React extension build.
      plugins: [{ name: 'automatic-jsx', config: () => ({ esbuild: { jsx: 'automatic' } }) }],
      build: { ...preset.build, outDir: join(root, 'dist'), minify: false,
        // React is not an SDK dependency; the assertion is about the import the
        // transform emits, not about bundling React itself.
        rollupOptions: { ...preset.build.rollupOptions, external: [/^react(\/|$)/] },
      },
    })
    const output = await readFile(join(root, 'dist/view.js'), 'utf8')
    assert.match(output, /react\/jsx-runtime/)
    assert.doesNotMatch(output, /jsxDEV|jsx-dev-runtime/)
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previous
    await rm(root, { recursive: true, force: true })
  }
})

test('retains the v1 single-entry build with a custom filename and bundled dynamic import', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agent-code-sdk-legacy-'))
  try {
    await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }))
    await writeFile(join(root, 'state.js'), 'export const value = 7')
    await writeFile(join(root, 'entry.js'), 'export async function activate() { return (await import("./state.js")).value }')
    const preset = extensionViteConfig({ entry: join(root, 'entry.js'), fileName: 'legacy' })
    await build({ ...preset, root, configFile: false, envDir: false, logLevel: 'warn',
      build: { ...preset.build, outDir: join(root, 'dist'), minify: false },
    })
    // Multi-entry support must not silently change existing authors' filenames or
    // produce undeclared lazy chunks where the old preset promised one module.
    assert.deepEqual(await readdir(join(root, 'dist')), ['legacy.js'])
    const legacy = await import(pathToFileURL(join(root, 'dist/legacy.js')).href)
    assert.equal(await legacy.activate(), 7)
  } finally { await rm(root, { recursive: true, force: true }) }
})
