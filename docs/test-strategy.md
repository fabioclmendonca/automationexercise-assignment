# Test Strategy

> Placeholder. This is the framework-foundation phase only; the full test
> strategy (risk-based prioritization, coverage matrix, exploratory charter)
> comes from a separate QA analysis pass.

## Architecture decisions (already decided - do not re-litigate)

- **No custom `BrowserFactory`.** Playwright's native browser projects and
  fixtures already manage `Browser`/`BrowserContext`/`Page` lifecycle. No
  concrete requirement in this assignment justifies wrapping that.
- **No `ApiClient` yet.** There is currently one API spec file. Introduce a
  client/helper only once at least two API test files show real, repeated
  request-construction duplication.
- **No `BasePage` yet.** There is currently one Page Object. Revisit only if
  two or more Page Objects show identical duplicated boilerplate - e.g. a
  shared header/nav component would be a composition candidate (a small
  `NavBar` component object used by multiple pages), not an inheritance base
  class.
- **ESLint intentionally excluded for this phase.** Strict TypeScript plus
  `tsc --noEmit` covers the essential correctness/type-safety value for a
  3-5 hour assignment. Adding ESLint config and dependencies is legitimate
  but non-essential scope right now.

## Verified API quirk: `responseCode` lives in the body, not just the status

`https://automationexercise.com/api/*` always responds with HTTP `200` at
the transport level, even for unsupported methods or business/validation
errors. The actual outcome is encoded in the JSON body via `responseCode`
(e.g. `200` for success, `405` for "this request method is not supported")
plus a `message` field.

This means `expect(response.status()).toBe(200)` alone is not sufficient
proof of success - it would pass even when the API returned an error body.
The API smoke test (`tests/api/smoke.spec.ts`) therefore asserts **both**:

1. `response.status() === 200` (transport reached, no network/proxy error), and
2. `body.responseCode === 200` (the API's own success signal) plus the shape
   of the expected payload (`body.products` is an array).

Any future API test exercising error/negative paths must assert on
`body.responseCode` (and `body.message` where meaningful), not on HTTP
status, since status alone will not distinguish success from failure here.
