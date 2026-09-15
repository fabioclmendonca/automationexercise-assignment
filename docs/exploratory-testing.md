# Exploratory Testing

One time-boxed exploratory session against the live site and API, run
2026-09-14, ahead of writing automated tests. Goal: surface risks a
spec-reading pass over the documented API and obvious UI flows would miss —
edge-case input, boundary values, and behavior the documentation doesn't
describe. All findings below were directly observed during this session
(via `curl` against the live API and a throwaway Playwright script driving
headless Chromium against the live site); nothing here is speculative.

## Charter

**Goal:** find behavior that would surprise a consumer of this API or a
user of this site, in areas most relevant to the quality priorities in
`test-strategy.md` — account/API contract edges, cart quantity handling,
and search input handling.

**Areas explored:**
- API: unsupported methods, malformed/mismatched content types, missing
  and unexpected fields, injection-shaped strings, and lookups with
  invalid/edge-case identifiers, across `productsList`, `searchProduct`,
  `verifyLogin`, `createAccount`, `deleteAccount`, `getUserDetailByEmail`.
- UI: product search with an XSS-shaped string, cart quantity at and beyond
  its boundaries, navigating to a non-existent product ID, and signup with
  an invalid email format.

**Out of scope for this session:** performance, authenticated/session
security testing, and anything requiring a completed real payment (see
`test-strategy.md` exclusions).

## Observations (non-findings worth recording)

- `POST /api/searchProduct` with `search_product=<script>alert(1)</script>`
  returns `{"responseCode":200,"products":[]}`, and the same string typed
  into the live product search box is not reflected unescaped into the
  page (`<script>alert(1)</script>` does not appear raw in the resulting
  DOM). Output encoding on this path looks correct — no XSS reflection
  found here.
- The signup form's email field uses native HTML5 `type="email"`
  validation and correctly blocks an obviously malformed value
  (`not-a-valid-email`) client-side before any request is sent. Contrast
  this with F5 below: this protection exists only in the browser, not on
  the API.
- The quantity `<input>` on the product detail page does carry
  `min="1"` (`<input type="number" name="quantity" id="quantity"
  value="1" min="1" />`), showing the intent to disallow sub-1 quantities.
  It just isn't enforced (F1). `min` on a number input constrains the
  spinner arrows and form-level constraint validation, but not direct
  keyboard entry — a real user typing "-5" and clicking "Add to Cart" hits
  this exact path; no special tooling is needed to reach it.

## Findings

### F1 — Cart accepts negative quantities and computes negative line totals

- **Area:** Cart / product detail (`/product_details/{id}`, `/view_cart`)
- **Steps:** On a product detail page, set the quantity field to `-5` and
  click "Add to Cart", then open the cart.
- **Expected:** Quantity is rejected or clamped to a minimum of 1 (the
  field itself declares `min="1"`); at minimum, the cart should never show
  a negative line total.
- **Observed:** The item is added with quantity `-5`. On `/view_cart` the
  row shows quantity `-5`, unit price `Rs. 500`, and **line total
  `Rs. -2500`**.
- **Severity/Priority:** High. This is a business-logic correctness defect
  in the one flow (cart) this application can't avoid getting right; a
  negative line total would corrupt any downstream total/checkout math. No
  real payment is being tested here, but the arithmetic itself is simply
  wrong regardless of that.
- **Reasoning:** Directly reproduced and re-verified (unit price × qty =
  -2500 exactly matches -5 × 500). Not an artifact of automation tooling:
  the input has no server round-trip validation and no client-side
  constraint check runs before the add-to-cart handler reads the raw
  field value, so a normal user typing a negative number reaches this
  exact state.

### F2 — No upper bound on cart quantity; quantities silently accumulate across adds

- **Area:** Cart / product detail
- **Steps:** Add the same product with quantity `999999999`, having
  already added `-5` of it earlier in the same session.
- **Expected:** Either a sane upper bound tied to real-world stock/business
  rules, or at least independent, predictable quantity handling.
- **Observed:** Cart shows quantity `999999994` (i.e. `-5 + 999999999`,
  confirming quantities accumulate rather than replace) with a computed
  total of `Rs. 499999997000`. No error, warning, or cap at any point.
- **Severity/Priority:** Medium. Less immediately damaging than F1 (the
  arithmetic here is at least internally consistent), but it's the same
  root cause — no validation on the quantity field — and confirms this
  isn't a one-off glitch. Worth fixing alongside F1 rather than separately.
- **Reasoning:** A demo site won't have real inventory limits, but zero
  validation of any kind (not even "this number is unreasonably large") on
  a field that directly drives a monetary total is a gap a real e-commerce
  system could not ship with.

### F3 — Non-existent product ID renders a blank product page with HTTP 200 instead of a not-found state

- **Area:** Product details (`/product_details/{id}`)
- **Steps:** Navigate to `/product_details/999999` (an ID very unlikely to
  exist in the catalog).
- **Expected:** A 404, redirect, or an explicit "product not found"
  message — something that tells the user (or a test) this product
  doesn't exist.
- **Observed:** HTTP 200. The full product-detail template renders
  (headings like "Availability", "Write A Review" are present as static
  page text), but the product name and price elements are both empty
  strings. Nothing on the page communicates that the product wasn't found.
- **Severity/Priority:** Medium. User-facing confusion (a shared link to a
  removed/renumbered product silently shows a blank page) and a
  testability risk: an automated test that checks for the presence of
  static template text (e.g. "Availability") rather than actual product
  data would pass against a completely broken product page.
- **Reasoning:** Directly observed; confirmed both the rendered text
  content and the navigation response status.

### F4 — API responses always return HTTP 200 and mislabel their own content type

- **Area:** All 14 documented `/api/*` endpoints.
- **Steps:** Called multiple endpoints with unsupported methods, missing
  params, and valid params (e.g. `POST /api/productsList`,
  `DELETE /api/verifyLogin`, `POST /api/searchProduct`), inspecting HTTP
  status and response headers each time.
- **Expected:** Standard REST/HTTP semantics — a 4xx/5xx status for
  errors/unsupported methods, and a `Content-Type` header that matches the
  actual body format.
- **Observed:** Every call, success or failure, returns HTTP `200`; the
  real outcome is only in the JSON body's `responseCode` (e.g. `405` for
  "This request method is not supported.", `400` for a missing parameter).
  Additionally, **every response's `Content-Type` header is
  `text/html; charset=utf-8`**, even though the body is always JSON.
  Separately, sending a JSON body (`Content-Type: application/json`) to
  `POST /api/searchProduct` is not parsed at all — the server responds
  with the same "parameter is missing" error it gives for a truly empty
  body, rather than a clear "unsupported content type" message, silently
  masking the real problem.
- **Severity/Priority:** Medium-high, as a **design/testability finding**
  rather than a simple bug — flagging this for awareness, since fixing it
  would be a breaking API change. Any consumer using standard HTTP idioms
  (`response.ok`, status-code-based branching, or a JSON-aware HTTP client
  that content-negotiates off `Content-Type`) will silently mishandle
  errors from this API. This also makes the API easy to get wrong in test
  automation: a naive assertion like `expect(response.status()).toBe(200)`
  passes for every single case above, including outright method-not-
  allowed and validation-failure responses.
- **Reasoning:** Verified directly via `curl -w "%{http_code} %{content_type}"`
  across five distinct call shapes (unsupported method, missing param,
  malformed content-type, and two valid calls) — all five returned
  `HTTP:200` and `CT:text/html; charset=utf-8` regardless of the actual
  outcome in the body. This is consistent with, and expands on, the
  quirk already recorded in `test-strategy.md`.

### F5 — No server-side email format validation; shared demo dataset is queryable with arbitrary strings

- **Area:** `GET /api/getUserDetailByEmail`, and by extension
  `POST /api/createAccount` (which accepts whatever string is placed in
  the `email` field with no visible format check, unlike the signup UI's
  client-side check — see Observations).
- **Steps:** Called `GET /api/getUserDetailByEmail?email=not-an-email` and
  separately with `email=` (empty string), then repeated the first call to
  check for repeatability. Also tried a freshly-generated random garbage
  string as a control.
- **Expected:** A malformed, non-email-shaped string should either be
  rejected as invalid input, or simply not match any account (404).
- **Observed:** `email=not-an-email` returns `responseCode: 200` with a
  full, real-looking account record (name "Senior QA", company "QA Tech");
  the query is repeatable (same account returned on a second call minutes
  later). `email=` (empty string) also returns `responseCode: 200` with a
  *different* real account (name "Rana", company "COFORGE", `zipcode: ""`).
  A freshly-generated random string, by contrast, correctly returns 404
  ("Account not found with this email, try another email!").
- **Severity/Priority:** Medium, as a **data-integrity / test-determinism
  risk** rather than a security bug (this is an intentionally public demo
  site, and the exposed data is dummy demo data). The concrete consequence
  for anyone automating against this API: obviously-invalid placeholder
  strings you might reach for in a negative test (`"not-an-email"`, `""`)
  are not guaranteed to be absent — they may already collide with another
  tester's leftover data on this shared instance.
- **Reasoning:** This is direct, repeatable evidence for the general
  "shared public demo site → test data pollution" risk already called out
  in `test-strategy.md`, not just an assumption — the pre-existing
  `not-an-email` and empty-string accounts are almost certainly leftovers
  from other candidates or QA practitioners using this same public
  instance, made possible by the total absence of server-side email
  validation on account creation. Directly informs a concrete rule for the
  automated suite: always generate unique, clearly-namespaced test emails
  (e.g. timestamp/UUID-suffixed) and never assert that an arbitrary string
  is absent from the system.

## Summary for implementation

- Cart quantity (F1/F2): automated E2E cart tests should use small
  realistic quantities for normal-path coverage; F1 specifically is a
  good candidate for one deliberate negative-path E2E test if time
  allows, since it's a confirmed, reproducible defect in a high-priority
  flow.
- Product-not-found (F3): worth one lightweight E2E check if time allows;
  otherwise recorded as a known gap.
- API response conventions (F4): already reflected in every API test's
  assertion style per `test-strategy.md` — assert `body.responseCode`,
  never rely on `response.ok()` or `Content-Type`.
- Shared-data risk (F5): already reflected in `test-strategy.md`'s
  assumptions/risks — unique generated test data, no "account does not
  exist" assertions, teardown via `deleteAccount` where practical.
