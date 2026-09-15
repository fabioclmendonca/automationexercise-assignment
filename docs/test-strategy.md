# Test Strategy

System under test: [automationexercise.com](https://automationexercise.com) (web UI)
and its public API at the same host. This document covers approach,
priorities, API vs E2E decisions, risks, assumptions, and exclusions. See
`docs/exploratory-testing.md` for the exploratory session and concrete
findings referenced below.

## Approach

Risk-based, not feature-count-based. A small number of automated checks at
the layer best suited to prove each behavior, backed by one exploratory
session against the live site/API to surface risks that a spec-reading pass
would miss. Playwright Test is used for both API (`request` fixture) and
browser automation, per the assignment's required technology. Every test is
tagged by domain (`@cart`, `@login`, `@checkout`, etc.) for selective
execution, and the suite runs inside the same Docker image both locally and
in CI — see `README.md` for the tag list and Docker usage.

## Priorities and rationale

1. **Account/auth lifecycle (signup, login, invalid login).** High priority.
   Every personalized and purchase-adjacent flow depends on it; a broken
   login blocks all downstream revenue activity. Signup involves real
   multi-step UI state (two-step form, "Account Created!" page) that is only
   provable end-to-end; `verifyLogin`/`createAccount` contracts are cheaply
   and reliably covered at the API layer.
2. **Cart behavior (add to cart, quantity handling, view cart).** High
   priority, and no longer hypothetical: exploratory testing found real
   correctness defects here (negative quantities produce negative line
   totals; no upper bound on quantity). See exploratory-testing.md findings
   F1/F2. Cart is a direct precursor to purchase and has no documented API,
   so it can only be tested through the browser.
3. **Product discovery (browse, search, category/brand filter).** Medium-high.
   Primary entry point to the catalog; if broken, the catalog is effectively
   invisible to users. `searchProduct` contract (valid/invalid) is an API
   concern; the search *experience* (typing, seeing results rendered) is a
   thin E2E smoke on top, not a duplicate of the API validation.
4. **Product details page.** Medium. Needed for an informed purchase
   decision (name, price, availability, image). Also where an exploratory
   finding surfaced: a non-existent product ID renders a blank-but-200
   template instead of a not-found state (finding F3).
5. **Checkout / order-placement path, end to end.** Medium-high.
   Business-critical in production. Full flow is in scope — cart →
   checkout → address/order review → dummy payment form → order
   confirmation — because the payment step is confirmed fake with no real
   gateway behind it (see Intentional exclusions and "Official test case
   coverage" below). A broken handoff at any step is a hard revenue
   blocker worth covering.
6. **API validation and negative business rules (the 14 documented
   endpoints).** High priority specifically at the API layer. These
   contracts are what any consumer (this UI, or a future one) depends on.
   Negative/validation cases are the cheapest, least flaky, highest-signal
   thing to automate, and the API's non-standard response convention
   (below) makes them easy to get subtly wrong if untested.

Lower priority / not actively pursued beyond a light look: Video Tutorials
page and other purely static content pages — low business risk, low
change frequency. (Contact Us and the Test Cases page are otherwise this
low-risk, but are covered anyway as part of the official 26-case list —
see "Official test case coverage" — for 1:1 interviewer traceability, not
because their risk profile changed.)

## API vs E2E coverage decisions

No cart or checkout endpoints exist in the documented API — cart/checkout
correctness can *only* be proven through the browser; this is a forced
choice, not a preference.

| Capability | Layer | Why |
|---|---|---|
| `GET /api/productsList` (200), `POST` (405) | API | Pure contract/method-restriction check; invisible in the UI. |
| `GET /api/brandsList` (200), `PUT` (405) | API | Same as above. |
| `POST /api/searchProduct` with/without param (200/400) | API | Validation contract. Paired with **one** thin E2E smoke that typing a search term and submitting renders results in the UI — proves wiring, not validation logic (no duplication). |
| `POST /api/verifyLogin` valid/invalid/missing-field, `DELETE` (405) | API | Fast, deterministic coverage of the auth contract's positive and negative paths. |
| Login **journey** (form submit → logged-in header state → logout) | E2E | Session/UI state (`Logged in as ...`, nav changes) can't be proven by an API call. |
| `POST /api/createAccount` (201), `PUT /api/updateAccount`, `GET /api/getUserDetailByEmail`, `DELETE /api/deleteAccount` | API | Full-payload contract checks; `deleteAccount` doubles as teardown for API-created test users. |
| Signup **journey** (two-step form, field-level validation, "Account Created!") | E2E | Multi-step UI flow and client-side validation behavior are not observable from the API alone. |
| Add to cart, update quantity, remove item, cart total | E2E | No API surface exists; this is the only way to exercise it. Exploratory testing already found this is where the real risk lives. |
| Checkout / order-placement journey through to confirmation, including the dummy payment form | E2E | Cross-page, cross-state journey; no API surface exists. The payment step is confirmed fake (see Intentional exclusions), so full-flow coverage carries no real money-risk. |
| Product listing/detail rendering from real catalog data | E2E (light) | One or two structural checks (a product card renders, "Add to cart" is present) — not a catalog content assertion (catalog can change). |

General rule applied throughout: don't duplicate the same assertion at both
layers without a reason. API tests own contract/validation correctness;
E2E tests own things that require a real browser (navigation, session
state, multi-step forms, rendered UI feedback).

## Official test case coverage

[automationexercise.com/test_cases](https://automationexercise.com/test_cases)
publishes a fixed, public list of 26 test cases. Deliberate decision for
this assignment: **the E2E suite covers all 26**, one spec per case, with
each test's title set to the case's exact official wording (e.g.
`test("Register User", ...)`), so an interviewer can cross-check the
suite 1:1 against the public list by title alone.

This is a conscious exception to this document's own general guidance
("prioritize by risk, not feature count"; "do not attempt exhaustive
coverage") — not a contradiction of it. The reasoning: this isn't
open-ended exhaustive testing of an unbounded surface. It's a small,
finite, publicly-documented list of 26 cases on a demo site that exists
specifically so testers can practice against it. Completeness against a
known, bounded, citable list is itself a meaningful and easily-verified
signal for this interview context, at negligible marginal cost per case
(each is a thin, focused E2E flow). This would not be the right call on a
production system with an open-ended feature surface — there the
risk-based prioritization above is what would apply.

All 26 cases are UI-level flows by their own definition, so **all 26 are
automated at the E2E layer**. Several still reuse the API-level building
blocks already covered elsewhere in this document (e.g. `createAccount`
for setup) — that's a test-data decision, not a change of layer, and
doesn't duplicate the API contract assertions already owned by the API
suite. The choice of API-provisioned vs. UI-provisioned test data per case
follows the same principle as the rest of this document: use the API when
account state is merely a precondition, use the UI when the
registration/login *interaction itself* is what the case is verifying.
Every case that creates an account (directly or as setup) uses a
unique/timestamped email, consistent with the data-pollution risk
documented below (no shared/hardcoded demo login, no assertions that
another tester's data does or doesn't exist, no orphaned state left
behind that would affect other public users of the shared site).

| # | Official title | Data setup | Rationale |
|---|---|---|---|
| 1 | Register User | UI (registration is the flow under test) | Unique/timestamped email per run so signup never collides with an existing account. |
| 2 | Login User with correct email and password | API `createAccount`, then UI login | Login is under test, not signup; API setup is faster and deterministic. |
| 3 | Login User with incorrect email and password | UI only, random never-registered credentials | Negative case; doesn't require or assert on any real account (avoids the F5 data-exposure risk below). |
| 4 | Logout User | API `createAccount`, then UI login → logout | Logout is under test; account creation is setup noise best kept off the UI. |
| 5 | Register User with existing email | API `createAccount` to guarantee a duplicate email exists, then UI registration attempt with that email | Needs a real, existing email deterministically, without depending on another tester's leftover data. |
| 6 | Contact Us Form | UI, unique name/email per run | Simple stateless form submission; no auth involved. |
| 7 | Verify Test Cases Page | None | Static content/navigation check. |
| 8 | Verify All Products and product detail page | None | Live catalog; structural assertions only — catalog content can change (see Key risks). |
| 9 | Search Product | None | UI companion to the existing `searchProduct` API contract test; proves wiring, not validation logic (no duplication). |
| 10 | Verify Subscription in home page | UI, unique email per run | Avoids an "already subscribed" state colliding across runs/testers. |
| 11 | Verify Subscription in Cart page | UI, unique email per run | Same subscribe widget, different page context. |
| 12 | Add Products in Cart | None (guest cart) | No auth required for cart on this site. |
| 13 | Verify Product quantity in Cart | None (guest cart); realistic quantity (1-3) | Ties to exploratory findings F1/F2 (no bound-checking) — normal-path coverage deliberately stays off that known edge case. |
| 14 | Place Order: Register while Checkout | UI, registration happens mid-checkout | Registering during checkout is the exact mechanic under test — can't be moved to API setup without defeating the case. |
| 15 | Place Order: Register before Checkout | UI, registration as an explicit prior step | The case's own script is "register, then checkout"; registering via the UI is what distinguishes it from cases 14 and 16. |
| 16 | Place Order: Login before Checkout | API `createAccount`, then UI login | Login-before-checkout is under test, not registration. |
| 17 | Remove Products From Cart | None (guest cart) | Add then remove; no auth needed. |
| 18 | View Category Products | None | Navigation/filter check. |
| 19 | View & Cart Brand Products | None (guest cart) | Navigation + add-to-cart; no auth needed. |
| 20 | Search Products and Verify Cart After Login | API `createAccount`, then UI login after a guest cart is built | Under test is cart persistence across login, not signup. |
| 21 | Add review on product | API `createAccount`, then UI login | Site requires login to submit a review; login is setup, not the assertion. |
| 22 | Add to cart from Recommended items | None (guest cart) | Homepage widget; no auth needed. |
| 23 | Verify address details in checkout page | API `createAccount` with full address fields | Makes the input address data deterministic so the checkout-page display can be asserted against a known value. |
| 24 | Download Invoice after purchase order | API `createAccount`, then UI login → full order placement | Full order-placement flow is in scope (see Intentional exclusions); login/account creation is setup, not the thing under test. |
| 25 | Verify Scroll Up using 'Arrow' button and Scroll Down functionality | None | Pure browser/UI behavior. |
| 26 | Verify Scroll Up without 'Arrow' button and Scroll Down functionality | None | Pure browser/UI behavior. |

## Key risks

- **Shared public demo site → test data pollution / non-determinism.** Not
  theoretical: exploratory testing queried `getUserDetailByEmail` with
  clearly-invalid strings (`not-an-email`, empty string) and got back real,
  pre-existing accounts from other testers (see exploratory-testing.md,
  F5). Automated tests must generate unique data per run (timestamp/UUID in
  emails), must not assert that a given email/account does *not* exist, and
  API-created accounts should be torn down via `deleteAccount` where
  practical.
- **Catalog contents can change over time.** Don't assert exact product
  names, counts, prices, or brand lists. Assert structure/shape (array
  present, expected fields, non-empty where a search term is known to have
  historically matched) and behavior, not fixed content.
- **Checkout's payment step is confirmed fake, not a real gateway.** The
  card-details form (Name on Card, Card Number, CVC, Expiration date) has
  no real payment gateway behind it — verified against the official test
  cases' own steps (14, 15, 16, 24), which use the same
  fictitious-data philosophy as the rest of this demo site. This makes
  full order-placement automation safe (see "Official test case coverage"
  and Intentional exclusions). The residual risk is narrower than "payment
  is untested": any quirks of this fake payment step (e.g. no real
  card-format validation) are demo-site behavior only and shouldn't be
  generalized to how a real payment gateway would behave.
- **The API always returns HTTP 200; the real result is in the body.**
  (Verified previously and reconfirmed during exploratory testing — see the
  quirk section below and exploratory-testing.md F4, which also found the
  `Content-Type` header is `text/html` on every response despite a JSON
  body.) Any test or client code that checks `response.ok()` or the HTTP
  status alone will pass on business failures. All API tests must assert on
  `body.responseCode`.
- **No bound checking on cart quantity.** Exploratory testing added a
  negative quantity and an extremely large quantity, both accepted without
  error (F1/F2). E2E cart tests should use small, realistic quantities
  (1–3) unless a test is deliberately targeting this known risk, so normal
  coverage doesn't silently ride on top of a buggy edge case.
- **Third-party public site, not our infrastructure.** No control over
  uptime, latency, or incidental UI changes (cookie/ad banners). Mitigated
  by the timeouts already configured in `playwright.config.ts`; not further
  hardened given the time-box.

## Assumptions

- `BASE_URL`/`API_BASE_URL` point at the public production site; no
  dedicated staging/test environment is provided or expected.
- No pre-seeded test account credentials are provided. Any flow requiring
  an authenticated user provisions its own account at test time (API
  `createAccount` for setup, or the UI signup flow when the signup journey
  itself is under test) rather than relying on a hardcoded demo login that
  another public user of the same shared site could alter or delete.
- The documented request/response shapes for the 14 endpoints are the
  contract. Tests assert on the documented fields, not the full response
  object, so additive API changes don't break tests unnecessarily.
- Aggregate/shared data (total product count, brand list, whether a given
  email "exists") can shift from other public users of the same site at any
  time; tests are written to be resilient to that rather than pinned to a
  snapshot.

## Intentional exclusions

- ~~Completing a real, paid checkout~~ — **reversed.** This was previously
  excluded on the assumption of real-payment risk. Inspecting the official
  test cases' verbatim steps (14, 15, 16, 24) confirmed the checkout
  payment step ("Name on Card, Card Number, CVC, Expiration date") has no
  real gateway behind it — the same fictitious-data pattern already used
  for account/address data elsewhere on this demo site (see Assumptions).
  A full order-placement flow (address/order review, order comment, dummy
  payment form, confirmation) is therefore now in scope: no money-risk or
  unsafe external-integration concern applies. See "Official test case
  coverage" above.
- Email verification / actual email delivery.
- Performance and load testing.
- Dedicated security testing (fuzzing, scanning, auth/authorization abuse).
  Exploratory testing includes a few opportunistic probes (e.g. an
  XSS-shaped search string, SQL-injection-shaped login input) because this
  is an explicitly public practice site where that's expected and safe, but
  this is not a security test suite and shouldn't be read as one.
- Visual regression testing.
- Exhaustive cross-browser/device matrix beyond the three desktop projects
  already configured (chromium/firefox/webkit); no mobile viewport matrix.
- Exhaustive field-by-field validation matrix for the ~15-field
  account/address forms — a representative sample of positive/negative
  cases is prioritized over completeness.
- ~~Contact Us form and other low-traffic static pages (Test Cases, Video
  Tutorials)~~ — **partially reversed.** Contact Us and the Test Cases page
  are official test cases (6 and 7) and are therefore now in scope — see
  "Official test case coverage" above. Video Tutorials and other purely
  static, non-interactive pages remain excluded; they aren't on the
  official list and carry no user-facing logic to break.

## Residual risk

Given the exclusions above, the following remain untested by design and
should be understood as accepted gaps for this assignment's scope: email
delivery, performance under load, and non-trivial security posture (authz,
session handling, rate limiting). Order-placement *flow* correctness
(address/order review, cart-to-order continuity, the dummy payment form,
confirmation and invoice download) is covered end-to-end — see "Official
test case coverage." What remains untested, because it cannot exist on
this site, is behavior against a *real* payment gateway (authorization,
declines, fraud/3-D-Secure flows). If this suite graduated toward
production use with a real gateway, that would be the first gap to close,
alongside security, likely against a non-shared/staging environment to
remove the data-pollution risk described above.

## Architecture decisions (already decided - do not re-litigate)

- **No custom `BrowserFactory`.** Playwright's native browser projects and
  fixtures already manage `Browser`/`BrowserContext`/`Page` lifecycle. No
  concrete requirement in this assignment justifies wrapping that.
- **No `ApiClient`.** There are now 6 API spec files; none share
  repeated *request-construction* logic (each still calls `request.get/post/
  put/delete` directly with its own inline payload) — the one instance of
  real duplication (the `AccountPayload` shape + `buildAccountPayload`
  helper, duplicated between `account-lifecycle.spec.ts` and
  `edge-cases/case-sensitive-login.spec.ts`) is test *data*, not a client,
  and is deliberately kept file-local per the API/E2E separation principle
  below — it doesn't meet the bar for a shared client.
- **No `BasePage` class.** There are now 9 Page Objects, and the predicted
  scenario below already happened twice — handled by composition, exactly
  as planned, not inheritance: `SubscriptionFooter` (shared by `HomePage`
  and `CartPage`) and `CartConfirmationModal` (shared by `ProductsPage` and
  `HomePage`) are both small composed objects, not a common base class.
  This confirms the original call rather than contradicting it.
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

Exploratory testing (see `docs/exploratory-testing.md`, finding F4) also
confirmed every response declares `Content-Type: text/html; charset=utf-8`
despite returning a JSON body, and that a JSON request body (as opposed to
form-encoded) is silently not parsed rather than rejected with a clear
error. Both reinforce the same point: don't rely on HTTP-standard signals
(status, content-type, `response.ok()`) against this API — assert on the
body's own fields.
