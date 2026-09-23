# Changelog

Release notes for 0.9.0 and earlier are in the annotated git tags (`git tag -l -n30 v0.9.0`). From 0.10.0 they live here as well.

## 0.10.0

Requires an Agent Code host with agent-code#1150 (PR #1151). Older hosts refuse a manifest that requests `net.origins`.

- **`net.origins` permission + manifest `networkOrigins`** (API v2):
  - 1–4 exact HTTPS origins that `net.fetch` may reach;
  - the install and update consent dialog lists them;
  - no wildcards, paths, IP literals, `localhost`, `.local` or trailing dots.
- **`net.fetch`:**
  - `responseType: 'text' | 'base64'` in the init;
  - `bodyEncoding: 'text' | 'base64'` in the result;
  - a host that predates this ignores `responseType`, so check `bodyEncoding`.
- **`api.secrets`** (`get`, `set`, `delete`) on views and runtimes, API v2, no permission:
  - values are encrypted with the OS keychain and scoped to the extension id;
  - they are deleted on uninstall.
- **Documented:**
  - `NetFetchInit` names the verb `httpMethod` (hosts before #1151 read `method`);
  - the body and response caps;
  - the lower result bound for background runtimes;
  - the host-reserved headers.
