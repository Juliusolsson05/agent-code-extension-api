// agent-code-extension-api — the public surface for authoring Agent Code extensions.
export type { AgentCodeApiV1, JsonValue } from './api.js'
export type { Disposable, ViewMount, ExtensionContext, ExtensionModule } from './module.js'
export { defineExtension } from './module.js'
export type {
  ExtensionManifest,
  ExtensionContributions,
  ExtensionCommandContribution,
  ExtensionViewContribution,
  ExtensionSettingContribution,
  ExtensionKeybindingContribution,
  ExtensionCapability,
  ExtensionActivationEvent,
  ExtensionViewMount,
} from './manifest.js'
export { extensionViteConfig } from './vite-preset.js'
export type { ExtensionViteOptions } from './vite-preset.js'
