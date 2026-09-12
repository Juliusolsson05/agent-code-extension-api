import type { ExtensionThemeContribution } from './themes.js'

// The manifest shape — canonical mirror of agent-code src/shared/types/extensions.ts.
// The app's zod schema is the real validator; this type just gives an author
// autocomplete and a compile error for a malformed agent-code.extension.json when
// they type it with `satisfies ExtensionManifest`.

export type ExtensionViewMount = 'modal' | 'panel'

export type ExtensionCommandContribution = {
  /** Must be namespaced `<extensionId>.` */
  id: string
  title: string
  description?: string
  keywords?: string[]
}

export type ExtensionViewContribution = {
  id: string
  title: string
  mount: ExtensionViewMount
  /** Required for apiVersion 2; exports mount(element, context). */
  entry?: string
}

export type ExtensionSettingContribution =
  | { id: string; title: string; description?: string; type: 'boolean'; default: boolean }
  | { id: string; title: string; description?: string; type: 'number'; default: number }
  | { id: string; title: string; description?: string; type: 'string'; default: string }

export type ExtensionKeybindingContribution = {
  command: string
  /** Accelerator, e.g. `cmd+shift+t`. Consulted after every first-party binding. */
  key: string
}

export type ExtensionContributions = {
  commands?: ExtensionCommandContribution[]
  views?: ExtensionViewContribution[]
  settings?: ExtensionSettingContribution[]
  keybindings?: ExtensionKeybindingContribution[]
  themes?: ExtensionThemeContribution[]
}

/**
 * A power requested beyond the always-granted Tier-0 API. Granted at install.
 *
 * ── THIS LIST MUST MATCH WHAT THE HOST IMPLEMENTS, NOT WHAT IT PLANS TO ──
 * It previously declared Tier 2/3 names before their transports existed. The host
 * removed that vocabulary and now restores a name only with its request, broker,
 * implementation and boundary tests; `fs.read` is the first such restored service.
 *
 * Keeping them here was worse than useless. This package exists so an author gets
 * a type error instead of a runtime surprise — and it delivered the exact opposite:
 * `permissions: ['fs.write']` type-checked cleanly and then failed the install.
 * A capability belongs in this union only once the host can actually perform it.
 */
export type ExtensionCapability = 'workspace.observe' | 'sessions.observe' | 'panes.observe' | 'fs.read'
type ExtensionCapabilityV1 = Exclude<ExtensionCapability, 'fs.read'>

export type ExtensionActivationEvent =
  | 'onStartupFinished'
  | '*'
  | `onCommand:${string}`
  | `onView:${string}`

type ExtensionManifestBase = {
  id: string
  name: string
  description: string
  version: string
  /** Relative path of the built ES module. Must stay inside the bundle. */
  entry: string
  keywords?: string[]
  activationEvents?: ExtensionActivationEvent[]
}

// A v2 declaration without a view entry type-checking successfully would defer
// an authoring error to installation. Keep that version distinction in the public
// type, while the host independently validates the JSON and real file containment.
export type ExtensionManifest = ExtensionManifestBase & (
  | { apiVersion: 1; permissions?: ExtensionCapabilityV1[]; contributes?: ExtensionContributions }
  | { apiVersion: 2; permissions?: ExtensionCapability[]; contributes?: Omit<ExtensionContributions, 'views'> & { views?: Array<ExtensionViewContribution & { entry: string }> } }
)
