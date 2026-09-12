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
    assert.deepEqual(manifest.permissions, ['fs.read', 'fs.write'])
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
