import type {
  ExtensionManifest, ExtensionPaneSnapshot, ExtensionSessionActivity, ExtensionSessionNotification, ExtensionSessionSnapshot,
  ExtensionThemeContribution, ExtensionWorkspaceSnapshot, RuntimeContext, TransportAttestation,
} from '../../dist/index.js'
import { TRANSPORT_ATTESTATION, TRANSPORT_ATTESTATION_HEADER } from '../../dist/index.js'

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
// The attestation contract is the host's literal wire value; a widened string
// type would let a service compare against a typo.
const attestedHeader: 'x-agent-code-transport' = TRANSPORT_ATTESTATION_HEADER
const attestations: TransportAttestation[] = [TRANSPORT_ATTESTATION.service, TRANSPORT_ATTESTATION.lan]
// @ts-expect-error Only the two host-set values exist
const unknownAttestation: TransportAttestation = 'local'
void attestedHeader
void attestations
void unknownAttestation
// Session status (0.11.0) is optional because older hosts omit it. If it were
// required, `row.activity === 'idle'` would compile for a row from an older host
// and silently read "not working" when the truth is "unknown".
declare const sessionRow: ExtensionSessionSnapshot
// @ts-expect-error activity may be absent; feature-detect before treating it as a known state
const knownActivity: 'working' | 'idle' = sessionRow.activity
const detectedActivity = sessionRow.activity ?? 'unknown'
// The machine kind is a closed set; the label is free text for display only.
// @ts-expect-error notification kinds are output | attention
const badKind: NonNullable<ExtensionSessionSnapshot['notification']>['kind'] = 'warning'
const label: string | undefined = sessionRow.notification?.label
void knownActivity
void detectedActivity
void badKind
void label
// Review of 0.11.0 (sdk-a/sdk-b): the lines above pinned only `activity`'s
// optionality and the kind set; these pin the rest of the published surface.
// `notification` must stay optional AND nullable: absent = older host, null =
// no badge. Required would make "no badge" compile on a host that cannot say.
// @ts-expect-error notification may be absent on older hosts
const knownBadge: ExtensionSessionNotification | null = sessionRow.notification
const noBadgeRow: ExtensionSessionSnapshot = { id: 's', kind: 'claude', cwd: '/x', title: null, notification: null }
// The activity set is closed: a new value is a breaking change (see the JSDoc).
const activities: ExtensionSessionActivity[] = ['working', 'idle']
// @ts-expect-error activity values are working | idle
const unknownActivity: ExtensionSessionActivity = 'starting'
// Both badge fields are required inside a badge.
const fullBadge: ExtensionSessionNotification = { kind: 'output', label: 'NEW' }
// @ts-expect-error a badge always carries the word Dispatch paints
const labelless: ExtensionSessionNotification = { kind: 'output' }
// The snapshot types are importable by name (the import above fails otherwise).
declare const workspaceSnapshot: ExtensionWorkspaceSnapshot
declare const paneSnapshot: ExtensionPaneSnapshot
void knownBadge
void noBadgeRow
void activities
void unknownActivity
void fullBadge
void labelless
void workspaceSnapshot
void paneSnapshot
