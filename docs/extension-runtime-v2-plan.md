# Shared runtime authoring contract

Continues SDK PR #1 alongside Agent Code PR #577 and issue #934. The existing
v1 helpers remain usable; API v2 explicitly separates one background runtime
from independently mounted view modules. No function crosses that boundary.

- Add typed runtime and view helpers matching the implemented host transport:
  command results, named JSON requests, published state, identities and cleanup.
- Represent v2 view entries and activation events without claiming unsupported APIs.
- Extend the Vite preset to emit separate runtime/view entries and shared chunks.
- Build a typed author fixture using the public package output, and verify its
  manifest and bundles through the host's real Electron integration journey.
- Update author guidance and generated dist together, retaining v1 compatibility.
- Synchronize PR #1 and the host submodule pin after checks pass. Do not merge.

Current host limits are bounded JSON (4096 values, depth 32, 128 Ki characters),
32 pending calls, 10-second startup, 30-second invocation, and 500 ms cooperative
shutdown. State must be saved when it changes: shutdown has no persistence guarantee.
Remaining scoped service APIs and Timer migration are tracked in the host plan.

Implemented: SDK 0.4.0 has discriminated v1/v2 manifests, runtime/view types and
helpers, independent multi-entry builds, committed generated output, and a typed
counter fixture. `npm ci` and `npm test` pass, including negative type contracts,
the actual multi-entry build/import journey, and the retained v1 single-entry
dynamic-import build. CI rebuilds and checks committed dist for drift. The host
consumes this fixture builder; its full Electron journey now passes, including
completed teardown. SDK CI passed at `05f97d2`. Host storage integration tests
also establish aggregate state/admission limits and corrupt-file preservation;
author guidance now records those constraints.
No package publication or PR merge is part of this checkpoint.

Next: mirror the host's declarative theme contribution contract, with known
appearance color keys and bounded hex/transparent values. Themes require no
runtime activation. Add a theme to the public author fixture, verify its built
manifest in host install/catalog/live-theme journeys, document authoring and
regenerate dist. Host selection and fallback remain application-owned.

SDK 0.5.0 now includes theme contributions and the exported color vocabulary.
The counter's built manifest contributes a palette; author type checks reject
unknown tokens and URL colors. Both actual author builds pass, and the host's
90 focused manifest/appearance/install checks pass, including vocabulary parity.
The expanded real Electron journey passes in PR #577: it installs this exact
SDK-built palette, selects it without runtime activation, pushes it before view
mount, updates it, rejects an invalid update without replacing it, and restores
the selection after uninstall/reinstall. Host final typecheck passes.

SDK 0.6.0 adds the first permissioned v2 service, `fs.read`, to runtime and view
contexts. Its target is an explicit live session id and project-relative path;
the host resolves the main-owned cwd, enforces containment and bounds UTF-8 reads.
The typed counter fixture declares the permission, and the host Electron journey
executes the built API from both isolated contexts.

SDK 0.7.0 adds `fs.write` on the same explicit session/path authority. Mutations
are UTF-8-only, byte-bounded and atomic; create-only calls use a null expectation,
while replacements require the opaque version returned by `fs.read`. The host and
SDK-built runtime/view journey cover consent, conflicts, containment and real bytes.
