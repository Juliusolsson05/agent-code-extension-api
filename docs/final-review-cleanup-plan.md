# 0.10.0 final-review cleanup (issue #5)

0.10.0 was merged in PR #4 at 318c1db and is **not yet tagged**. The final
review's SDK findings therefore fold into 0.10.0. There is no version bump,
and the CHANGELOG entry is amended in place.

1. `secrets` becomes optional (`secrets?`) on `RuntimeApiV2` and the v2
   `ViewContext` api. Older API-v2 hosts do not provide it, and the documented
   `if (context.api.secrets)` guard must be meaningful to the compiler.
   `bodyEncoding?` already models "older host" this way. The contract fixture
   gains an `@ts-expect-error` for unguarded use. Rebuild dist.
2. One host-requirement phrase everywhere: "Agent Code ≥ the first supporting
   version". The concrete version lives only in the CHANGELOG placeholder,
   which is filled at release. Author-facing text drops the internal PR/issue
   history (#1150, #1151, "design round").
3. The `ExtensionNetApi` JSDoc and the README document the host timeouts:
   10 s for private addresses (`net.connect`), 15 s for declared origins
   (`net.origins`).
4. Export the service attestation contract from `service.ts` and the index:
   `TRANSPORT_ATTESTATION_HEADER = 'x-agent-code-transport'` and
   `TRANSPORT_ATTESTATION = { service, lan }`, with the trust rules a service
   must apply. The host re-pins and imports these, so the name has one source.

Verification: `npm test`, `npm run check:dist`, CI `authoring`.
