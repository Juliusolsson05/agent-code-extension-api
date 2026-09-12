import type { ExtensionManifest, ExtensionThemeContribution, RuntimeContext } from '../../dist/index.js'

const base = { id: 'example', name: 'Example', description: 'Type contract fixture', version: '1', entry: 'runtime.js' }
const view = { id: 'example.main', title: 'Example', mount: 'panel' as const }
const legacy: ExtensionManifest = { ...base, apiVersion: 1, contributes: { views: [view] } }
// A newly optional view entry would otherwise silently defer this error to install.
// @ts-expect-error API v2 must name an independently built view module
const missingViewEntry: ExtensionManifest = { ...base, apiVersion: 2, contributes: { views: [view] } }
declare const runtime: RuntimeContext
const fileRead = runtime.api.files.readText({ sessionId: 'session-one', path: 'src/index.ts' })
// @ts-expect-error A runtime cannot register a closure that belongs to a view document
runtime.registerView('example.main', () => {})
void legacy
void missingViewEntry
void fileRead
const reader: ExtensionManifest = { ...base, apiVersion: 2, permissions: ['fs.read'] }
// @ts-expect-error The frozen v1 API has no permissioned filesystem service
const legacyReader: ExtensionManifest = { ...base, apiVersion: 1, permissions: ['fs.read'] }
// @ts-expect-error Theme token names must match the host appearance vocabulary
const unknownThemeToken: ExtensionThemeContribution = { id: 'example.night', title: 'Night', colors: { background: '#123456' } }
// @ts-expect-error Declarative host themes cannot carry network-bearing CSS values
const themeUrl: ExtensionThemeContribution = { id: 'example.night', title: 'Night', colors: { canvas: 'url(https://example.test)' } }
void unknownThemeToken
void themeUrl
void reader
void legacyReader
