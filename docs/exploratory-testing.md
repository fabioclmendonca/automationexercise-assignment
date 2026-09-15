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

- Cart quantity (F1/F2): automated E2E cart tests use small realistic
  quantities for normal-path coverage. F1 is now a deliberate
  `test.fail()` regression test,
  `tests/e2e/edge-cases/cart-negative-quantity.spec.ts`.
- Product-not-found (F3): now a deliberate `test.fail()` regression test,
  `tests/e2e/edge-cases/product-not-found.spec.ts`.
- API response conventions (F4): already reflected in every API test's
  assertion style per `test-strategy.md` — assert `body.responseCode`,
  never rely on `response.ok()` or `Content-Type`.
- Shared-data risk (F5): already reflected in `test-strategy.md`'s
  assumptions/risks — unique generated test data, no "account does not
  exist" assertions, teardown via `deleteAccount` where practical.

## Session 2 — follow-up on domain-analysis hypotheses

**Charter (follow-up session, same day):** a short, targeted second pass
against the live site/API to directly verify seven specific hypotheses
raised during domain analysis but not yet checked by any existing test or
the first session (H1–H3 cart behavior with multiple products/repeat adds
and an empty cart, H4–H5 account/auth edge cases, H6–H7 two more API
contract edges). Same method as session 1: `curl` for API calls, throwaway
Playwright scripts (Chromium, headless) driving the live site for UI
behavior. Each hypothesis below is reproduced directly, not inferred.

### H1 — Adding the same product twice via separate "Add to cart" clicks

- **Done:** As a guest, opened `/product_details/2` (Men Tshirt, Rs. 400),
  clicked "Add to cart", navigated away to `/`, then navigated back to
  `/product_details/2` and clicked "Add to cart" again (a second, separate
  action on the same product, not an edit of the quantity field).
- **Observed:** `/view_cart` shows exactly **one row** (`#product-2`) with
  quantity `2` and total `Rs. 800`. No duplicate row was created.
- **Verdict:** No finding. The cart correctly merges repeat adds of the
  same product into the existing row's quantity rather than duplicating
  it.

### H2 — Checkout total with multiple different products at different quantities

- **Done:** Logged in as a fresh account, added Blue Top (`Rs. 500`) at
  quantity `2` and Sleeveless Dress (`Rs. 1000`) at quantity `3` (two
  separate products, two separate quantities — every existing test in this
  repo only ever carries one product), then proceeded to `/checkout`.
- **Observed:** `/view_cart` line totals: `Rs. 1000` and `Rs. 3000`
  (correct: `500×2` and `1000×3`). On `/checkout`, the "Review Your Order"
  table reproduces both line items with the same per-line totals and adds
  a **"Total Amount" row of `Rs. 4000`** — the exact sum of the two lines.
- **Verdict:** No finding. Multi-product, multi-quantity checkout totals
  are computed correctly.

### H3 — Navigating directly to `/checkout` with an empty cart

- **Done:** Logged in as a brand-new account that had never added anything
  to its cart in this session, confirmed `/view_cart` shows "Cart is
  empty! Click here to buy products.", then navigated directly to
  `/checkout` by URL. To establish real impact rather than just a
  rendering quirk, also filled the order comment, clicked "Place Order",
  filled the dummy payment form, and clicked "Pay and Confirm Order".
- **Observed:** `/checkout` returns HTTP `200` and renders the full
  Address Details / Review Your Order page with an **empty item table**
  and **"Total Amount" `Rs. 0`** — no redirect, warning, or block of any
  kind. Continuing the flow, the order was accepted end-to-end: the page
  navigated to `/payment`, and after submitting the dummy card form it
  reached `/payment_done/0` displaying "ORDER PLACED! Congratulations!
  Your order has been confirmed!" with a working "Download Invoice" link.
- **Verdict:** Promoted to **F6** (see below). Reproducible, high-impact:
  a real order confirmation is issued for a cart containing zero items and
  Rs. 0.

### H4 — HTML/script-injection-shaped name reflected in the "Logged in as" header

- **Done:** Signed up a new account with name
  `<script>alert(1)</script>Marker4` via the real signup form (not the
  API), completed the account-information form, and after landing on the
  logged-in home page, read both the `innerText` and the raw `outerHTML`
  of the header's "Logged in as" element.
- **Observed:** `outerHTML` is `<a><i class="fa fa-user"></i> Logged in as
  <b>&lt;script&gt;alert(1)&lt;/script&gt;Marker4</b></a>` — the tag
  delimiters are HTML-entity-encoded (`&lt;`/`&gt;`). The literal string
  `<script>` never appears unescaped in the DOM; no script executes and no
  raw markup renders.
- **Verdict:** No finding. Output encoding on this header is correct. This
  is a second, independent confirmation (alongside the search field
  checked in session 1) that this application escapes user-supplied
  strings on render rather than trusting them.

### H5 — Login with different email casing than registered

- **Done:** Created an account via `POST /api/createAccount` with a
  lowercase email (`teste.case.<ts>@example.com`), confirmed
  `POST /api/verifyLogin` succeeds with that exact casing, then called the
  same endpoint again with the email upper-cased
  (`TESTE.CASE.<TS>@EXAMPLE.COM`), same password.
- **Observed:** Exact casing: `{"responseCode": 200, "message": "User
  exists!"}`. Upper-cased email: **`{"responseCode": 404, "message":
  "User not found!"}`**. `verifyLogin` is the same endpoint the login form
  submits to, so this is authoritative for the login UI's behavior, not
  just an API-only code path.
- **Verdict:** Promoted to **F7** (see below). Login is case-sensitive on
  the email address.

### H6 — `PUT /api/updateAccount` targeting an email that was never registered

- **Done:** Called `PUT /api/updateAccount` with a full, valid-shaped
  payload (all required fields present) but an email that has never been
  used to create an account on this instance.
- **Observed:** `{"responseCode": 404, "message": "Account not found!"}`.
- **Verdict:** No finding. Correct, clear not-found handling — this path
  behaves properly, in contrast to the missing coverage gap that prompted
  the hypothesis (every existing test only calls `updateAccount` against
  an account the same test just created).

### H7 — `POST /api/createAccount` with exactly one required field missing

- **Done:** Called `createAccount` with every required field present
  except `zipcode`. As a control, repeated the call with the request body
  completely empty (all fields missing).
- **Observed:** Missing only `zipcode`: `{"responseCode": 400, "message":
  "Bad request, zipcode parameter is missing in POST request."}` — the
  message names that exact field. Fully empty body (control):
  `{"responseCode": 400, "message": "Bad request, name parameter is
  missing in POST request."}` — names `name`, the first field it checks.
- **Verdict:** No finding (positive result worth recording). Real
  per-field validation exists: the API does not silently accept an
  incomplete payload, and it does not return one generic "something is
  missing" message either — it identifies the specific missing field each
  time, which is more precise and more testable than either failure mode
  the hypothesis was checking for.

### F6 — Checkout confirms a real order for an empty cart

- **Area:** Checkout (`/checkout`, `/payment`, `/payment_done/{id}`)
- **Steps:** Log in with an account whose cart has never had an item
  added, navigate directly to `/checkout`, click "Place Order", fill the
  dummy payment form, click "Pay and Confirm Order".
- **Expected:** A cart with zero items should block checkout — redirect to
  `/view_cart` or the products page, or at minimum disable "Place Order"
  and/or reject the order server-side.
- **Observed:** `/checkout` renders normally (HTTP 200) with an empty
  order table and `Total Amount: Rs. 0`, "Place Order" is enabled and
  clickable, the dummy payment form submits, and the flow completes at
  `/payment_done/0` with "ORDER PLACED! Congratulations! Your order has
  been confirmed!" and a working invoice download.
- **Severity/Priority:** High. This is the same class of issue as F1 (a
  core business-logic flow — the one thing checkout must get right —
  accepting a state it clearly wasn't designed for), but one step further
  down the funnel: F1 corrupts a total; this issues a confirmed order
  record with no items and no value. Any downstream system trusting
  "order placed" as a signal (fulfillment, analytics, email) would act on
  a phantom order.
- **Reasoning:** Directly reproduced through the full user-facing flow,
  not just observed at the page-render level — the "no items" state was
  confirmed on `/view_cart` immediately beforehand, and the order was
  carried through to a real confirmation page and order ID (`0`), not
  merely accepted by an intermediate step.

### F7 — Login is case-sensitive on the registered email address

- **Area:** `POST /api/verifyLogin` (backs the `/login` form)
- **Steps:** Register an account with a lowercase email, verify login
  succeeds with that exact casing, then attempt login with the same email
  upper-cased.
- **Expected:** Most real-world account systems (and email providers)
  treat the mailbox address as effectively case-insensitive for login
  purposes, even though the local part is technically case-sensitive per
  RFC 5321; users commonly expect `Name@Example.com` and
  `name@example.com` to be the same account, and mobile keyboards'
  auto-capitalization makes an accidental case mismatch a routine
  real-world occurrence.
- **Observed:** `{"responseCode": 404, "message": "User not found!"}` for
  the upper-cased email, against `{"responseCode": 200, "message": "User
  exists!"}` for the exact original casing — the account is otherwise
  identical and was created and queried within the same short window.
- **Severity/Priority:** Medium. Not a security issue, and not
  unambiguously "wrong" per spec — but a genuine usability/business risk:
  a plausible real-world path (mobile auto-capitalize, copy-pasting an
  email from an all-caps source, a user who registered via a
  case-preserving field and later half-remembers it) locks a legitimate
  user out with a generic "not found" message that gives no hint the
  cause is casing.
- **Reasoning:** Directly reproduced via the exact endpoint the login form
  submits to, with a matched-pair comparison (identical account, identical
  password, only the email's casing changed) rather than a one-off call.

## Non-findings from this session

- **H1:** repeat "Add to cart" on the same product merges into the
  existing cart row's quantity; no duplicate row.
- **H2:** checkout's "Total Amount" correctly sums multiple line items at
  different quantities (`1000 + 3000 = 4000`, exact).
- **H4:** an HTML/script-injection-shaped signup name is HTML-entity-
  encoded when rendered in the "Logged in as" header; no reflected XSS.
- **H6:** `updateAccount` against a never-registered email returns a
  clean, correct `404`/"Account not found!" — no gap here.
- **H7:** `createAccount` performs real per-field validation, naming the
  specific missing field each time, rather than a single generic message
  or silent acceptance.

## Summary for implementation (session 2)

- Empty-cart checkout (F6): now a deliberate `test.fail()` regression
  test, `tests/e2e/edge-cases/empty-cart-checkout.spec.ts` — logs in, skips
  adding any product, asserts the order-confirmation message is not shown.
- Case-sensitive login (F7): now a normal passing test,
  `tests/api/edge-cases/case-sensitive-login.spec.ts` — pins the current
  behavior (`verifyLogin` 404s on the registered email's case flipped) as
  documented, not treated as a defect.
- H1/H2 (cart merge behavior, multi-item checkout totals): confirmed
  correct — no automated coverage strictly required to "catch" a bug, but
  H2 in particular is a reasonable candidate for a single positive E2E
  test since it exercises a path (multiple products in one cart) nothing
  else in this repo currently covers.
- H4/H6/H7: confirmed correct/secure; no action needed beyond what
  `test-strategy.md` already plans.
