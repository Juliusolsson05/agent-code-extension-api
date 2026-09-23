import type { ExtensionManifest, ExtensionThemeContribution, RuntimeContext } from '../../dist/index.js'

const base = { id: 'example', name: 'Example', description: 'Type contract fixture', version: '1', entry: 'runtime.js' }
const view = { id: 'example.main', title: 'Example', mount: 'panel' as const }
const legacy: ExtensionManifest = { ...base, apiVersion: 1, contributes: { views: [view] } }
// A newly optional view entry would otherwise silently defer this error to install.
// @ts-expect-error API v2 must name an independently built view module
const missingViewEntry: ExtensionManifest = { ...base, apiVersion: 2, contributes: { views: [view] } }
declare const runtime: RuntimeContext
const fileRead = runtime.api.files.readText({ sessionId: 'session-one', path: 'src/index.ts' })
const fileWrite = runtime.api.files.writeText({
  sessionId: 'session-one', path: 'src/generated.ts', text: 'export {}', expectedVersion: null,
})
const notification = runtime.api.notifications.show('Background work complete')
// @ts-expect-error Replacements must carry an explicit read version; omission cannot mean clobber.
runtime.api.files.writeText({ sessionId: 'session-one', path: 'src/index.ts', text: 'changed' })
// @ts-expect-error A runtime cannot register a closure that belongs to a view document
runtime.registerView('example.main', () => {})
void legacy
void missingViewEntry
void fileRead
void fileWrite
void notification
const reader: ExtensionManifest = {
  ...base, apiVersion: 2, permissions: ['fs.read', 'fs.write', 'notifications.show'],
}
// @ts-expect-error The frozen v1 API has no permissioned filesystem service
const legacyReader: ExtensionManifest = { ...base, apiVersion: 1, permissions: ['fs.read'] }
// @ts-expect-error The frozen v1 API cannot request project mutation.
const legacyWriter: ExtensionManifest = { ...base, apiVersion: 1, permissions: ['fs.write'] }
// @ts-expect-error A v1 module dies with its view and cannot request background notifications.
const legacyNotifier: ExtensionManifest = {
  ...base, apiVersion: 1, permissions: ['notifications.show'],
}
// @ts-expect-error Theme token names must match the host appearance vocabulary
const unknownThemeToken: ExtensionThemeContribution = { id: 'example.night', title: 'Night', colors: { background: '#123456' } }
// @ts-expect-error Declarative host themes cannot carry network-bearing CSS values
const themeUrl: ExtensionThemeContribution = { id: 'example.night', title: 'Night', colors: { canvas: 'url(https://example.test)' } }
void unknownThemeToken
void themeUrl
void reader
void legacyReader
void legacyWriter
void legacyNotifier
// Older API-v2 hosts lack secrets. The type must force the documented feature
// detection, or a missing guard compiles and then crashes on such a host.
// @ts-expect-error api.secrets is optional; narrow with `if (runtime.api.secrets)` first
const unguardedSecret = runtime.api.secrets.get('api-key')
const guardedSecret = runtime.api.secrets ? runtime.api.secrets.get('api-key') : Promise.resolve(null)
void unguardedSecret
void guardedSecret
