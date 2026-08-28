# UI implementation rules

For any user-facing UI change, read and follow `design/lookandfeel.md` before editing.

For component implementation or refactoring, read and follow `reference-implementation.md` before editing.

For mobile workspace/list changes, the "Approved create-workspace reference" in that document is mandatory. Do not introduce a competing navigation, action, color, or container pattern without first updating that reference with the reason.

In particular, multi-step workflows must be built as real pages using the established page canvas and navigation patterns. Do not reuse modal shells on routes, and do not use ambiguous route actions such as “Close”; use destination-aware navigation instead.

# Architecture rules

For feature-boundary, package-layout, or test-organization changes, read and follow `design/architecture.md` before editing.

# Test implementation rules

Tests should be short, isolated, and focused on the one behavior they prove.

A test over about 40 lines is a smell. Prefer extracting setup into a local harness, fixture builder, or `beforeEach` default state. The test body should show the behavior, not reconstruct the world.

Every test must start from a known default state. Use `beforeEach` to reset mocks, fake stores, fixture state, and default responses. The default state should represent the simplest happy path for the system under test. Do not rely on module-level mutable state that is not reset by `beforeEach`.

Wrap tests in a `describe` block that names the point of the tests. Avoid putting anything outside that `describe` except imports.

Use `it` instead of `test`. The `it` description should read as a behavioral statement about what is being proven, not just repeat the function name. For example, prefer `it("rejects candidates the requester does not own", ...)` over `it("addCandidatesToPool rejects ids not owned by the requester", ...)`.

Before invoking the system under test, change only the meaningful input for that case. Avoid long per-test setup blocks like deeply nested SQL response queues unless the queue itself is the behavior being tested. Prefer mutating a semantic scenario object prepared by `beforeEach`, then let the harness translate that scenario into mocks or fake responses.

The system under test should usually be invoked in one clear line or one small block. If the call needs a large payload, build a named fixture and override only relevant fields.

Assert externally visible behavior first. Implementation details such as SQL shape should only be asserted when that shape is the contract being protected.
