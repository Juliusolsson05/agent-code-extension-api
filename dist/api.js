// The Agent Code host API, version 1 — the canonical mirror.
//
// Source of truth: agent-code src/renderer/src/apps/api/types.ts. This copy exists
// so an extension author gets types WITHOUT depending on the app's source tree. If
// the two ever drift, the app wins and this file is the bug (the app's frame broker
// is what actually answers these calls).
//
// Every method returns a Promise, on purpose: an extension runs in a sandboxed
// iframe and reaches the host only over postMessage, where nothing can be
// synchronous. The runtime the host injects fulfils this shape (see the frame
// bootstrap). Tier 0 — storage/ui/theme — needs no permission; anything more is a
// declared capability granted at install.
export {};
