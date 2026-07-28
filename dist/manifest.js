// The manifest shape — canonical mirror of agent-code src/shared/types/extensions.ts.
// The app's zod schema is the real validator; this type just gives an author
// autocomplete and a compile error for a malformed agent-code.extension.json when
// they type it with `satisfies ExtensionManifest`.
export {};
