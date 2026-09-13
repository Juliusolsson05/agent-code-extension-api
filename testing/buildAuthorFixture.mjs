import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import { extensionViteConfig } from '../dist/index.js'

// Shared with the host's real Electron journey: its installer must consume the
// exact artifacts an author builds from the public SDK and preset, rather than
// a handwritten JS approximation of those contracts.
export async function buildAuthorFixture(outDir) {
  const fixture = fileURLToPath(new URL('../examples/counter/', import.meta.url))
  const preset = extensionViteConfig({ entries: {
    runtime: join(fixture, 'runtime.ts'), view: join(fixture, 'view.ts'), manifest: join(fixture, 'manifest.ts'),
  } })
  await build({ ...preset, root: fixture, configFile: false, envDir: false, logLevel: 'warn',
    build: { ...preset.build, outDir, emptyOutDir: true, minify: false },
  })
  // Node imports the manifest only; the browser modules are executed by the
  // Electron host. Preserve ESM semantics for the standalone build smoke test.
  await mkdir(dirname(join(outDir, 'package.json')), { recursive: true })
  await writeFile(join(outDir, 'package.json'), JSON.stringify({ type: 'module' }))
  const { default: manifest } = await import(pathToFileURL(join(outDir, 'manifest.js')).href)
  await writeFile(join(outDir, 'agent-code.extension.json'), JSON.stringify(manifest))
  return manifest
}
