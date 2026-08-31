# Testing Strategy

This document defines how Brackeroni should use tests to protect behavior without locking the codebase to incidental implementation details.

`design/architecture.md` describes the system boundaries. This document describes how those boundaries should be tested.

# Testing Goals

Tests should make it hard to accidentally change public behavior and easy to refactor private implementation.

The preferred order of confidence is:

1. Contract tests for the public API
2. Unit tests for pure domain logic
3. Public-interface service tests for application behavior
4. Small smoke tests for external wiring when useful

Do not add tests only to improve coverage numbers. Coverage should point us toward missing contracts, untested pure logic, or risky code that needs isolation.

# Contracts

There are three kinds of contracts in this repo.

## API Contract

The OpenAPI document in `openapi/document.js` is the true external contract.

It defines:

1. route paths
2. HTTP methods
3. path parameters
4. query parameters
5. request bodies
6. response bodies
7. status codes
8. error shapes

App-level tests should use this document directly. A route test that only checks a hand-written response object is not enough when the endpoint is documented in OpenAPI.

## Package Contracts

Public package entry points are contracts inside the app.

Examples:

1. `@/lib/brackets`
2. `@/lib/brackets/types`
3. `@/lib/pools`
4. `@/lib/pools/types`

Tests outside a domain should import these public entry points, not internal files. The public type files matter because they describe the package contract for internal callers.

## Pure Engine Contracts

Pure engine modules are directly testable contracts.

Examples:

1. `lib/brackets/engine/rounds.ts`
2. `lib/brackets/engine/match-resolution.ts`
3. `lib/brackets/engine/swiss-standings.ts`
4. `lib/brackets/engine/effort-estimates.ts`

These tests should be direct unit tests. They should not go through API routes or database-backed services.

# API Contract Testing

API route tests should validate real route-handler behavior against `openapi/document.js`.

The contract test harness should support:

1. locating an OpenAPI operation by method and path
2. resolving local `$ref` schema references
3. validating request bodies against the documented request schema
4. validating response bodies against the documented response schema
5. validating error responses against the documented error schema
6. constructing request URLs with path and query parameters
7. reading `Response` status, headers, and JSON body from route handlers

Use a real OpenAPI or JSON Schema validator. Do not hand-roll schema validation with ad hoc assertions.

Reasonable implementation choices:

1. `ajv`
2. `ajv-formats`
3. a small local helper around `openapi/document.js`

The helper should live under `test/app/` or `test/support/`, not in production code.

# Route Test Shape

Route tests should call route handlers directly.

They should not start a Next.js server. They should not need a real database.

For a route like:

```text
POST /api/tournaments
```

The test should:

1. load the OpenAPI operation for `POST /api/tournaments`
2. build a request body that validates against the OpenAPI request schema
3. mock authentication at the app boundary
4. mock the public lib handle used by the route
5. call the exported route handler
6. assert the status code
7. validate the JSON response against the OpenAPI response schema
8. assert the route called the public lib interface with the expected semantic payload

The test should not assert incidental implementation details such as every helper call or exact internal service module used.

# Invalid Input Tests

Invalid input tests are contract tests too.

For every documented request body, add a small number of invalid cases that prove:

1. missing required fields are rejected
2. invalid enum values are rejected
3. invalid UUID/path/query values are rejected where documented
4. invalid pagination is rejected where documented
5. the error response validates against the OpenAPI error schema

Prefer a table of narrow cases over one giant test.

The point is not to duplicate every Zod rule in tests. The point is to prove that the route applies the documented input contract at the boundary.

# Response Contract Tests

Every app route contract test should validate response shape through the OpenAPI schema.

This is especially important for:

1. collection wrappers such as `{ items, meta }`
2. detail wrappers such as `{ item }`
3. error wrappers such as `{ error }`
4. HAL `_links`
5. nullable fields
6. enum fields

When a route returns a response shape that is useful but not documented, update the OpenAPI document first or in the same change.

# OpenAPI Completeness Tests

The test suite should include architecture-style tests that compare route files and OpenAPI paths.

These tests should fail when:

1. an implemented `app/api/**/route.js` path is missing from OpenAPI
2. an OpenAPI path has no matching route file
3. a mutating operation has no request body schema
4. an operation has no success response schema
5. an operation has no documented error response
6. an operation accepts path parameters not documented in OpenAPI
7. OpenAPI documents path parameters that are not present in the route path

These tests protect the API contract itself. They are not replacements for route behavior tests.

# Lib Tests

Lib tests should stay focused on package contracts and pure logic.

Use lib tests for:

1. bracket engine behavior
2. pool package behavior through `@/lib/pools`
3. bracket package behavior through `@/lib/brackets`
4. public type-driven behavior inside package boundaries
5. isolated policy functions that are intentional public module contracts

Avoid using lib tests to validate API request and response shapes. Those belong at the app route contract layer because the OpenAPI document is the source of truth for external callers.

# Stateful Workflow Boundary

`lib/brackets/internal/stateful-workflows/` contains code where SQL, authorization-sensitive state, and transactional orchestration are intentionally coupled.

Do not import this directory directly from tests just to increase coverage.

When behavior in this area is externally visible, cover it through:

1. a public bracket handle or directory test, if it is package-level behavior
2. an API route contract test, if it is externally observable API behavior

If a change in this area cannot be tested without asserting a long SQL queue, that is a signal to either:

1. extract pure domain logic into `lib/brackets/engine/`, or
2. keep the workflow isolated and document the risk

# What Not To Test

Avoid tests that assert:

1. private file names
2. internal helper call order
3. exact SQL text unless SQL shape is the contract
4. long mocked SQL response queues solely for coverage
5. implementation-specific route helper sequencing
6. behavior already covered by a lower-level pure unit test unless the API contract depends on it

It is acceptable for dangerous orchestration code to have lower coverage when it is isolated and the public behavior is covered elsewhere.

# Suggested Rollout

Build this in stages.

## Stage 1: Contract Harness

Add a reusable API contract test helper that can:

1. resolve OpenAPI schemas
2. validate request bodies
3. validate response bodies
4. call route handlers directly
5. normalize route paths between `app/api/**/route.js` and OpenAPI paths

Add one route test using the helper before applying it broadly.

Recommended first route:

```text
POST /api/tournaments
```

Reason: it exercises auth, request validation, public bracket package usage, and a documented creation response.

## Stage 2: Coverage Of Core API Families

Add contract tests for one happy path and one invalid input path for each core route family:

1. pools
2. pool candidates
3. tournaments
4. tournament entries
5. tournament matches
6. match votes
7. tournament rounds
8. share links
9. parallel tournaments
10. bracket templates

Keep each test focused. Do not build a full workflow in a single route test.

## Stage 3: Completeness Guardrails

Add architecture tests that compare OpenAPI paths to implemented route files.

This should make undocumented endpoints and stale OpenAPI paths obvious.

## Stage 4: Tighten OpenAPI Schemas

As route contract tests expose loose areas, tighten the OpenAPI document.

Prefer:

1. explicit `required`
2. explicit nullable fields
3. enums for known modes/statuses
4. reusable component schemas
5. documented error responses

Avoid broad `{}` schemas except where the API truly accepts arbitrary metadata.

## Stage 5: Optional Coverage Gates

Only after the harness is useful, consider scoped coverage thresholds.

Good candidates:

1. `lib/brackets/engine/**`
2. route contract coverage by API family
3. OpenAPI completeness tests

Avoid global coverage gates while large UI areas and intentionally isolated stateful workflows are still uneven.

# Maintenance Rules

When changing an API route:

1. update `openapi/document.js` when the external contract changes
2. update or add route contract tests for changed request or response behavior
3. mock public package interfaces, not internal modules
4. keep invalid input tests aligned with the OpenAPI schema

When changing pure engine logic:

1. add direct engine tests
2. cover edge cases and invariants
3. keep tests independent of app routes and database behavior

When changing stateful workflows:

1. identify the public behavior first
2. prefer a public handle, directory, or API contract test
3. extract pure logic if direct assertions become SQL-sequence tests
4. document untestable risk when extraction is not worth it
