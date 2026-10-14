# Changelog

Release notes for 0.9.0 and earlier are in the annotated git tags (`git tag -l -n30 v0.9.0`). From 0.10.0 they live here as well.

## 0.11.0

Requires **Agent Code ≥ the first supporting version** for the new fields. It is named here once that release ships. On older hosts the fields are absent; nothing else changes.

- **Agent status on session rows.** `sessions.observe()` rows gain two optional fields (`sessions.observe` permission, no new permission):
  - `activity?: 'working' | 'idle'`: whether the agent is busy now, the same rule as Dispatch's running count;
  - `notification?: { kind: 'output' | 'attention'; label: string } | null`: the Dispatch badge for that agent, with `label` the exact word it paints.
- **`sessions.subscribe` also fires when either field changes.** The host coalesces these, and streaming output alone never fires it.
- **Feature-detect.** A row without `activity` comes from an older host. Treat it as "unknown", not "idle".
- **New exports:** `ExtensionSessionSnapshot`, `ExtensionSessionActivity`, `ExtensionSessionNotification`, `ExtensionWorkspaceSnapshot`, `ExtensionPaneSnapshot`. The snapshot types existed before but could not be imported by name.
- The README install line now names the current tag (it still said v0.8.0).

## 0.10.0

Requires **Agent Code ≥ 0.1.3**, the first supporting version. The README and JSDoc refer to it as "Agent Code ≥ the first supporting version". Older hosts refuse a manifest that requests `net.origins`.

**Feature-detect `api.secrets`.** It is optional (`secrets?`) on every API-v2 context. Older v2 hosts do not provide it, and a secrets-only extension requests no new permission, so an older host still loads it. Check `if (context.api.secrets)` before use, and never fall back to `api.storage` for a credential.

- **`net.origins` permission + manifest `networkOrigins`** (API v2):
  - 1–4 exact HTTPS origins that `net.fetch` may reach;
  - the install and update consent dialog lists them;
  - no wildcards, paths, IP literals, `localhost`, `.local` or trailing dots.
- **`net.fetch`:**
  - `responseType: 'text' | 'base64'` in the init;
  - `bodyEncoding: 'text' | 'base64'` in the result;
  - hosts older than Agent Code ≥ the first supporting version ignore `responseType`, so check `bodyEncoding`.
- **Transport attestation contract** exported for services: `TRANSPORT_ATTESTATION_HEADER` (`x-agent-code-transport`) and `TRANSPORT_ATTESTATION` (`service` / `lan`), with the rules for when a service may trust it.
- **`api.secrets`** (`get`, `set`, `delete`) on views and runtimes, API v2, no permission:
  - values are encrypted with the OS keychain and scoped to the extension id;
  - they are deleted on uninstall.
- **Documented:**
  - `NetFetchInit` names the verb `httpMethod` (older hosts read `method`);
  - the fixed timeouts: 10 s for private addresses, 15 s for declared origins;
  - the body and response caps;
  - runtimes and views receive the same `net.fetch` responses (the runtime channel admits a result up to the 256 KiB cap after base64);
  - invalid view arguments now reject with `Invalid arguments for <method>.` instead of leaving the promise pending;
  - the host-reserved headers.
