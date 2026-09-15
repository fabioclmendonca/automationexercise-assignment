# Implementation Plan

> **Note:** file paths throughout this document have been kept up to date
> with the `pages/`/`fixtures/` → `tests/pages/`/`tests/fixtures/` move and
> the `tests/e2e/fixtures/` → `tests/e2e/data/` rename. The edge-cases
> extraction, domain tagging, and containerized execution that came after
> Phase 2 are not woven into the Phase 1/Phase 2 narrative below — see
> **Phase 3** for those.

Scope: turn the validated framework foundation (config, `HomePage`, one
fixture, two smoke tests, CI) into the real API + E2E coverage described in
`docs/test-strategy.md`, informed by `docs/exploratory-testing.md`. Planning
only — no code in this document. Written for a remaining budget inside the
assignment's overall 3–5 hour timebox (strategy/exploratory docs and the
foundation already consumed part of it).

Existing smoke tests (`tests/api/smoke.spec.ts`, `tests/e2e/smoke.spec.ts`)
are kept as-is; nothing below replaces them.

## Verified before planning (not assumed)

The sketch this plan is based on flagged the checkout-gating scenario as
"verify actual UI behavior before committing." Checked directly against the
live site (`curl` against `/view_cart`): the "Proceed To Checkout" button
(`.check_out`) runs client-side JS that checks a server-rendered
`logged_in_user` value; when falsy it shows `#checkoutModal` instead of
navigating to `/checkout`. So the gate is a **client-side modal, not a
redirect** — confirmed mechanism, not invented. Exact modal copy/locator
should still be inspected once in a real browser during implementation
(cart must be non-empty for the modal markup to render), but the mechanism
to assert against is now known.

## Ordered tasks

1. **Page Objects** (`tests/pages/SignupLoginPage.ts`, `tests/pages/ProductsPage.ts`,
   `tests/pages/ProductDetailPage.ts`, `tests/pages/CartPage.ts`)
   - Goal: locators + actions only (no assertions), same style as
     `tests/pages/HomePage.ts`, one per UI surface actually exercised below.
   - `SignupLoginPage`: signup name/email fields + button; login
     email/password + button; account-information form fields (title,
     password, DOB, first/last name, address, country, state, city,
     zipcode, mobile — sensible fixed defaults owned by the page object for
     fields not under test); "Account Created!" / "Account Deleted!"
     locators; header "Logged in as ..." text and "Delete Account" link.
   - `ProductsPage`: search input + submit, product card locator (name,
     price, "View Product" link), search-results container.
   - `ProductDetailPage`: product name, price, quantity input, "Add to
     Cart" button, "View Cart" link (post-add modal).
   - `CartPage`: cart row locators (name, price, quantity, line total),
     "Proceed To Checkout" button, checkout modal.
   - Validation: `tsc --noEmit` passes; no assertions present in these
     files (grep check).

2. **Fixture wiring** (`tests/fixtures/fixtures.ts`)
   - Goal: inject the four new Page Objects alongside `homePage`, replacing
     the "remove if it never grows past one Page Object" comment with a
     short note that it has now grown as anticipated.
   - Validation: `tsc --noEmit` passes; existing `tests/e2e/smoke.spec.ts`
     still passes unmodified.

3. **API tests** (`tests/api/`) — see scenario table below for detail.
   - `products-brands.spec.ts`, `search.spec.ts`, `login-negative.spec.ts`,
     `account-lifecycle.spec.ts`.
   - Validation: `npm run test:api` green; every assertion reads
     `body.responseCode` (never bare `response.ok()`/status alone, per the
     documented API quirk).

4. **E2E tests** (`tests/e2e/`) — see scenario table below for detail.
   - `registration.spec.ts`, `product-details.spec.ts`, `cart.spec.ts`,
     `checkout-gating.spec.ts`.
   - Validation: `npm run test:e2e` green across chromium/firefox/webkit
     (allow for third-party-site flakiness already accepted in the
     strategy doc's risks section).

5. **README refresh** (`README.md`)
   - Goal: the current intro paragraph says real coverage is "added on top
     of this foundation separately" — update it once that coverage exists
     so the README accurately reflects the finished suite. Scripts section
     is already correct and needs no change.
   - Validation: a reviewer reading `README.md` alone can install, run, and
     understand what's covered without opening every spec file.

6. **CI check (no functional change expected)**
   - Goal: confirm `.github/workflows/playwright.yml` still runs
     everything with no new secrets/env vars (all tests target the public
     site with defaults). If a step needs updating, do the minimum.
   - Validation: CI run (or a local `npm test` standing in for it) is
     green.

7. **Final validation**
   - `npm run typecheck && npm test` locally.
   - Confirm no test depends on execution order, no hardcoded catalog
     content (product names/prices/counts) is asserted, and every
     API-created account is deleted (lifecycle test's own cleanup, plus
     the registration E2E test's self-delete).

## API scenarios (`tests/api/`)

| # | File | Scenario | Why high-value | Dependencies | Validation |
|---|---|---|---|---|---|
| 1 | `products-brands.spec.ts` | `GET /productsList` (200), `POST /productsList` (405); `GET /brandsList` (200), `PUT /brandsList` (405) | Cheapest, most stable coverage of two read-only contracts that are invisible in the UI (strategy priority 6) | None — no auth, no test data | `body.responseCode` 200/405 per case; `body.products`/`body.brands` is an array on the 200 cases |
| 2 | `search.spec.ts` | `POST /searchProduct` with `search_product` (200); without the param (400) | Validation contract belongs at the API layer; paired with a thin E2E smoke elsewhere (no duplication) | None | `body.responseCode` 200/400; `body.products` array on success, `body.message` present on the 400 case |
| 3 | `login-negative.spec.ts` | `POST /verifyLogin` missing email (400); invalid credentials (404); `DELETE /verifyLogin` (405) | Fastest, most deterministic coverage of the highest-priority capability's failure modes (priority 1). No valid-login case here — `account-lifecycle.spec.ts` already exercises a real valid login, so this file stays negative-only and avoids duplicating that positive path | None (deliberately invalid/missing input, not existence lookups — avoids the F5 shared-data pollution trap) | `body.responseCode` per case (400/404/405) and `body.message` where present |
| 4 | `account-lifecycle.spec.ts` | Sequential: `createAccount` → `getUserDetailByEmail` → `verifyLogin` (valid) → `updateAccount` → `getUserDetailByEmail` again (confirm the update persisted) → `deleteAccount` (cleanup) | Only place a real valid login and a real create/update/delete cycle are exercised (priority 1 and 6); the second `getUserDetailByEmail` call proves the `PUT` actually mutated state rather than just returning a 200 body, which matters given the API's documented habit of being permissive about response codes (F4) | A file-local `buildAccountPayload(email)` helper generating one unique (timestamp/UUID-suffixed) email plus the fixed required fields for `createAccount`; `test.step` per stage for readability; `deleteAccount` called from a `try/finally` (or `test.afterEach`) so cleanup runs even if an earlier step's assertion fails | `body.responseCode` 200/201 at each step; `getUserDetailByEmail` echoes the created name/email; second `getUserDetailByEmail` reflects the field changed by `updateAccount`; final `deleteAccount` responseCode 200 |

`buildAccountPayload` stays local to this one file — it is not shared with
the E2E registration test. Sharing a data builder across `tests/api/` and
`tests/e2e/` would blur the "clear separation between API tests and E2E
tests" design guideline for a small, one-line-per-layer saving; each layer
generates its own unique email independently instead.

## E2E scenarios (`tests/e2e/`)

| # | File | Scenario | Why high-value | Dependencies | Validation |
|---|---|---|---|---|---|
| 1 | `registration.spec.ts` | Signup (name+email) → two-step account-information form → "Account Created!" → logged-in header state → self-delete account → "Account Deleted!" | Only way to prove this multi-step UI flow and session state (priority 1); every personalized/purchase flow depends on it | `SignupLoginPage`; a one-line unique email generated inline in the test (e.g. timestamp-suffixed) | "Account Created!" heading visible; header shows "Logged in as `<name>`"; "Account Deleted!" visible after cleanup |
| 2 | `product-details.spec.ts` (test A) | Capture name+price of the first product card on `/products`, search using a substring of that same name, open the matching result, confirm the product-detail page shows the same name+price | Covers product discovery/search *experience* (priority 3) and product-detail rendering (priority 4) in one journey without pinning to hardcoded catalog content (strategy's residual-risk rule) or duplicating the API's `searchProduct` validation coverage | `ProductsPage`, `ProductDetailPage` | Search results list contains the captured name; detail page name/price equal what the listing/search card showed |
| 2b | `product-details.spec.ts` (test B, regression) | Navigate directly to `/product_details/<id-very-unlikely-to-exist>` | Confirmed defect F3 (blank 200 page, no not-found signal) in the product-details flow; cheap to add since it reuses `ProductDetailPage` with no extra setup | `ProductDetailPage` | Written with `test.fail()` encoding the *expected* behavior (an explicit not-found indication); currently red-as-expected today, would flip to an unexpected pass (visible signal) if the app is ever fixed — comment links to F3 in `docs/exploratory-testing.md` |
| 3 | `cart.spec.ts` (test A) | Add a product with a small realistic quantity (2) to cart, view cart, confirm name/unit price/quantity/line total are correct | Highest-value UI-only area (priority 2) — no API surface exists for cart at all, and exploratory testing found this is exactly where real defects live | `ProductDetailPage`, `CartPage` | Row shows the added product's name, quantity = 2, and line total = unit price × 2 (computed from the two captured values, not hardcoded) |
| 3b | `cart.spec.ts` (test B, regression) | Add a product with quantity `-5`, view cart | Confirmed defect F1 (negative quantity → negative line total), a real correctness bug in the highest-priority UI-only flow; near-zero marginal cost since it reuses test A's Page Objects | `ProductDetailPage`, `CartPage` | Same `test.fail()` pattern as F3: encodes the *expected* behavior (quantity rejected/clamped, line total never negative); documents the known defect without normalizing it as "correct" |
| 4 | `checkout-gating.spec.ts` | Add an item to cart as a guest, click "Proceed To Checkout" | Covers checkout up to the strategy's safe boundary (priority 5) — proves the login/registration gate without touching payment; a broken gate is a hard revenue blocker either direction (bypass or false block) | `CartPage` extended with the "Proceed To Checkout" button + checkout-modal locators (no new Page Object — both live on the page `CartPage` already models) | Checkout modal becomes visible; URL remains on `/view_cart` (no navigation to `/checkout`) |

### F1/F3 decision

Both get their own deliberate regression test, using Playwright's
`test.fail()` annotation rather than asserting the buggy behavior as if it
were correct. Reasoning: marginal cost is near-zero (both reuse Page
Objects already built for the happy-path tests above, no new setup, no new
fixtures), the strategy doc explicitly leans yes for both "if time allows,"
and `test.fail()` keeps the signal honest — a reviewer scanning results
sees two intentionally-expected failures tied to named findings, not two
green tests that quietly bake a known bug in as "expected" behavior
forever. If the implementation timebox gets tight, these two are the
correct things to cut first (marked lowest-priority within required work,
not folded into the optional section, since they were assessed and kept
deliberately).

## Files/modules to be created

- `tests/pages/SignupLoginPage.ts`, `tests/pages/ProductsPage.ts`,
  `tests/pages/ProductDetailPage.ts`, `tests/pages/CartPage.ts`
- `tests/fixtures/fixtures.ts` (edit: extend, don't replace)
- `tests/api/products-brands.spec.ts`
- `tests/api/search.spec.ts`
- `tests/api/login-negative.spec.ts`
- `tests/api/account-lifecycle.spec.ts` (contains the file-local
  `buildAccountPayload` helper — no separate file)
- `tests/e2e/registration.spec.ts`
- `tests/e2e/product-details.spec.ts`
- `tests/e2e/cart.spec.ts`
- `tests/e2e/checkout-gating.spec.ts`
- `README.md` (edit: intro paragraph only)

No new top-level folders, no `ApiClient`, no `BasePage`, no `NavBar`
component object, no cross-layer data-builder module — none of these are
justified by the scenario list above.

## Out of scope (from `docs/test-strategy.md`, not re-argued here)

- ~~Completing a real, paid checkout~~ and ~~Contact Us and other
  low-traffic static pages~~ — both **later reversed** once Phase 2 (below)
  confirmed the payment step is fake and added Contact Us/Test Cases as
  official cases 6/7. Accurate for Phase 1 at the time; see
  `docs/test-strategy.md`'s "Intentional exclusions" for the current list.
- Email verification / actual email delivery.
- Performance and load testing.
- Dedicated security testing (fuzzing, auth/authorization abuse) beyond
  the opportunistic probes already recorded in exploratory testing.
- Visual regression testing.
- Any browser/device matrix beyond the existing chromium/firefox/webkit
  projects.
- Exhaustive field-by-field validation matrix for the account/address
  forms.
- `BrowserFactory`, `ApiClient`, `BasePage`, ESLint — already decided
  against for this phase in `test-strategy.md`'s architecture section.
- A shared `NavBar` component object — only one spec (`registration`)
  touches header/logged-in state; revisit only if a second Page Object
  needs the same locators.

## Optional / nice-to-have (separate from required work above)

Only pursue after all required tasks are done and validated:

- ~~Test tagging~~ — **done** in a later pass, though with a different
  scheme than sketched here: domain tags (`@cart`, `@login`, `@checkout`,
  etc.) shared across API and E2E where the same concept exists at both
  layers, plus `@edge-case` for F1/F3/F6/F7 and checkout-gating, rather
  than a single `@regression` tag. See Phase 3 below.
- Dedicated tests for F2 (no upper bound on cart quantity) or F5 (no
  server-side email format validation) — the strategy doc treats these as
  already-mitigated-by-process (F2 "worth fixing alongside F1" with no
  test recommendation; F5 already reflected in data-uniqueness rules) and
  does not call for dedicated automated coverage the way it does for F1/F3.
- ESLint configuration.
- Expanding the checkout journey UI coverage (e.g. asserting the address
  review step) beyond the login/registration gate, if a real login session
  is threaded through — not required to satisfy priority 5's "safe
  boundary" framing.

## Phase 2: Official test case coverage (26 cases)

Scope: close the gap to 26/26 official test cases from
[automationexercise.com/test_cases](https://automationexercise.com/test_cases),
per the deliberate scope decision recorded in `docs/test-strategy.md`'s
"Official test case coverage" section (read there for the per-case
data-setup rationale — not repeated in full here). Every new `test(...)`
whose scenario is one of the 26 uses that case's **exact official title**
as its title string, so an interviewer can cross-check 1:1 against the
public list. Phase 1's files, Page Objects, and fixtures are extended, not
replaced; nothing in Phase 1 is redesigned. `checkout-gating.spec.ts` and
the two `test.fail()` regression tests stay exactly as-is — they are bonus
coverage outside the 26 and are not renamed.

### File-by-file breakdown

| File | Status | Official cases it contains |
|---|---|---|
| `tests/e2e/registration.spec.ts` | Modify existing test | 1 |
| `tests/e2e/login.spec.ts` | New | 2, 3, 4, 5 |
| `tests/e2e/contact-us.spec.ts` | New | 6 |
| `tests/e2e/navigation.spec.ts` | New | 7, 18, 19 |
| `tests/e2e/product-details.spec.ts` | Extend existing file | 8, 9, 21 |
| `tests/e2e/subscription.spec.ts` | New | 10, 11 |
| `tests/e2e/cart.spec.ts` | Extend existing file | 12, 13, 17, 20, 22 |
| `tests/e2e/checkout.spec.ts` | New | 14, 15, 16, 23, 24 |
| `tests/e2e/scroll.spec.ts` | New | 25, 26 |
| `tests/e2e/checkout-gating.spec.ts` | Unchanged | none (bonus, not renamed) |

1 + 4 + 1 + 3 + 3 + 2 + 5 + 5 + 2 = 26. (A later pass moved
`checkout-gating.spec.ts` into `tests/e2e/edge-cases/` and extracted the
F1/F3 regressions out of `cart.spec.ts`/`product-details.spec.ts` into that
same folder, alongside new F6/F7 tests — not reflected in the table above;
see Phase 3 below for exact file locations. None of that changes the 26
official-case count or their contents.) Grouping rule: reuse a Phase 1 file
when the new case shares its domain and Page Objects with what's already
there (registration/login/logout all revolve around `SignupLoginPage`;
product discovery/detail/review all revolve around `ProductsPage` +
`ProductDetailPage`; cart-only cases all revolve around `CartPage`); create
a new file only for a domain that doesn't already have one (contact form,
static/category/brand navigation, subscription widget, checkout/order
placement, scroll behavior).

`login.spec.ts` groups 2–5 rather than splitting further because all four
are short, share `SignupLoginPage`, and together read as one coherent
"login surface" story (correct, incorrect, logout, duplicate-email) —
splitting them into four one-test files would add file count without
adding clarity.

`navigation.spec.ts` groups 7 (static Test Cases page), 18 (category
sidebar), and 19 (brand sidebar) because all three are "click a nav
element, verify the resulting page" with no cart/auth involvement — not
because 7 is architecturally related to 18/19, but because a dedicated
one-test file for case 7 alone would be disproportionate to how trivial
that check is.

### Page Object changes

**New:**

- **`tests/pages/CheckoutPage.ts`** — address/order-review display, order
  comment textarea, "Place Order" button, payment form (name on card, card
  number, CVC, expiration month/year), "Pay and Confirm Order" button,
  order-confirmation success message, "Download Invoice" button/link. See
  design decision below for its `completeOrder()` method.
- **`tests/pages/ContactUsPage.ts`** — name/email/subject/message fields, file
  upload input, submit button, success message, "Home" button. Exposes
  `submitAndAcceptDialog()`, which registers `page.once('dialog', d =>
  d.accept())` immediately before clicking Submit so the native
  `window.confirm()` triggered by this site's Contact Us form (confirmed
  live, not assumed) is handled deterministically instead of racing the
  click.
- **`tests/pages/CartConfirmationModal.ts`** — small composed component (not a
  base class) for the "added to cart" modal (`#cartModal` + its "View
  Cart" link). Held as a property on `ProductsPage` and `HomePage` (see
  design decision below). `ProductDetailPage`'s existing inline
  `cartModal`/`viewCartLink` locators are **left untouched** — Phase 1
  code is not retrofitted to use this component, per the instruction not
  to redesign what's already implemented and passing. Architect review
  flagged this as a maintenance trap if left silent (same DOM modeled two
  different ways with no signal linking them): add a one-line comment on
  `ProductDetailPage`'s `cartModal`/`viewCartLink` fields noting they model
  the same modal as `CartConfirmationModal` and were deliberately not
  migrated, so a future editor fixing one knows to check the other.
- **`tests/pages/SubscriptionFooter.ts`** — small composed component for the
  subscription widget (email input, subscribe button). Held as a property
  on `HomePage` and `CartPage` (see design decision below).

**Extended:**

- **`SignupLoginPage`**: newsletter checkbox (`#newsletter`), special-offers
  checkbox (`#optin`) for case 1's completeness gap; incorrect-login error
  text locator ("Your email or password is incorrect!"); duplicate-email
  error text locator ("Email Address already exist!"); a `logoutLink`
  locator (the spec asserts "navigated to login page" via URL, not a new
  page-object method).
- **`ProductsPage`**: category accordion locators (`womenToggle`,
  `menToggle`, `kidsToggle`, and `subcategoryLink(name)` scoped under the
  open panel), `brandLink(name)`; a hover-triggered "Add to cart" action
  for a listing card (`addToCartFromListing(card)`, distinct from
  `ProductDetailPage`'s add-to-cart) using the new `CartConfirmationModal`;
  a `continueShoppingButton` locator (case 12's "Continue Shopping" step).
- **`ProductDetailPage`**: category/availability/condition/brand text
  locators (case 8); a review-form section (`reviewNameInput`,
  `reviewEmailInput`, `reviewTextArea`, `reviewSubmitButton`,
  `reviewSuccessMessage` — confirmed live at `#review-form`/`#name`/
  `#email`/`#review`/`#button-review`).
- **`CartPage`**: a remove ("X") locator per row (`removeButtonFor(row)`,
  confirmed live as `.cart_quantity_delete` inside each row); a
  `registerLoginLinkInModal` locator inside the existing `checkoutModal`
  plus `clickRegisterFromCheckoutModal()`, needed by cases 14 and 24 which
  proceed from the guest-checkout modal into signup; a `subscriptionFooter`
  property (see below).
- **`HomePage`**: a `subscriptionFooter` property (see below); a
  "Recommended Items" section (`recommendedItemsHeading`,
  `recommendedItemCards`, add-to-cart per card via the new
  `CartConfirmationModal`); `scrollUpArrow` (`#scrollUp`) and a stable
  `heroHeading` locator for the "Full-Fledged practice website for
  Automation Engineers" text; `scrollToBottom()` and a keyboard/JS
  `scrollToTop()` (for case 26, which must not use the arrow button).

### `CheckoutPage` design decision

**One class, with a shared `completeOrder(comment: string)` method**, used
by cases 14, 15, and 16 as-is, and by case 24 followed by an extra
`downloadInvoice()` call. Reasoning: cases 14/15/16/24 are identical from
"Proceed To Checkout" onward (verify Address Details/Review Your Order,
enter a comment, Place Order, fill payment details, Pay and Confirm Order,
verify success) and differ only in (a) how the account got there
(register-during / register-before / login-before / register-during again
for 24) and (b) whether an invoice is downloaded afterward. Payment field
values are not under test in any of these cases (same reasoning already
applied in `SignupLoginPage.createAccount()`, which hardcodes non-tested
address fields), so `completeOrder()` fills them with fixed dummy values
internally, mirroring that existing pattern rather than inventing a new
one.

Case 23 stops before payment (it only verifies delivery/billing address
against the account's registration data), so it uses only
`CheckoutPage`'s address-display locators directly in the test — it does
not call `completeOrder()`. This matches existing repo precedent
(`CartPage` exposes raw per-row locators like `nameFor`/`totalFor` for
single-call-site assertions with no wrapping "verify" method), so no
sub-method is introduced for this one call site.

Per project standards ("keep assertions in tests by default"),
`completeOrder()` must perform actions through to the success state and
expose the confirmation-message locator without asserting on it itself —
each spec asserts the confirmation message. This matters concretely for
case 24, which needs to assert success *before* calling
`downloadInvoice()`; if `completeOrder()` asserted internally, case 24
would have no seam to insert that call at the right point.

### Subscription-footer and cart-confirmation-modal decisions

**`SubscriptionFooter`** (2 locators — email input, subscribe button —
plus one `subscribe(email)` action) is a small composed object held by
both `HomePage` (case 10) and `CartPage` (case 11). Confirmed live via
`curl` that both pages render identical footer markup with the same IDs
(`#susbscribe_email`, `#subscribe`) — this is real, demonstrated
duplication across exactly two Page Objects, not a speculative one. This
matches the threshold `test-strategy.md`'s architecture-decisions section
already set for a `NavBar`-style component ("revisit... if two or more
Page Objects show identical duplicated boilerplate").

**`CartConfirmationModal`** applies the identical reasoning at the same
threshold: two new Page Objects (`ProductsPage` for case 12, `HomePage`
for case 22) both need the same "added to cart" modal + "View Cart" link
after a hover-triggered add-to-cart. A shared component is used for these
two *new* usages only; `ProductDetailPage`'s existing inline version is
not touched, so Phase 1 is not redesigned. (Assumption to confirm live
during implementation: that the homepage's recommended-item add-to-cart
triggers the same global `#cartModal`, not a page-specific variant —
likely, since it's the same site-wide AJAX add-to-cart handler, but not
yet directly observed for this specific entry point.)

Both decisions were sized against the same three review-test questions:
real duplication (yes, confirmed for both), does it aid readability (yes —
"subscribe to the footer" / "confirm the add-to-cart modal" read better
than repeating 2–3 raw locators inline), is it simpler than what it
replaces (yes — each is under 15 lines and holds no state).

### Test data / setup approach

Beyond the per-case API-vs-UI table already decided in
`docs/test-strategy.md`, one new construct is added: an **`apiAccount`
fixture** in `tests/fixtures/fixtures.ts`, typed `TestAccount` (name, email,
password, firstname, lastname, address1, country, state, city, zipcode,
mobile_number — the same shape as the existing `AccountPayload` in
`tests/api/account-lifecycle.spec.ts`, but a separate type local to
`fixtures.ts`; not imported across the API/E2E boundary, preserving the
"each layer generates its own payload" decision already recorded for
`buildAccountPayload`). On setup it POSTs a unique (timestamp/UUID-
suffixed) email to `/api/createAccount` using the `request` fixture
Playwright already provides in every project; on teardown it best-effort
`DELETE`s the same account (try/catch, warn-only, same pattern as the
existing best-effort cleanups), matching `account-lifecycle.spec.ts`'s
existing conventions.

This is the one deviation from the task's sketch worth calling out: the
sketch described "API-provisioned test accounts for TC2, TC4, TC16, TC20"
as a per-case decision; this plan promotes it to a shared fixture because,
once case 21 and 23 are added (both also API-provisioned per
`test-strategy.md`'s table) plus case 5's need for a pre-existing account
to collide with, **seven** of the 26 cases need "a unique account exists
via the API, with known credentials/address" as setup. That is real,
counted duplication (not a hypothetical one), and a fixture also
guarantees the teardown actually runs rather than depending on every spec
author remembering a `try/finally`. Cases 1, 14, 15, 24 still use UI-driven
signup directly (registration is either the thing under test or is
scripted as part of the checkout flow itself), consistent with the
strategy table — they do not use this fixture.

A small fixed upload fixture, `tests/e2e/data/sample-upload.txt`, is
added for case 6's file-upload step, as already sketched.

### Cleanup / hygiene for every account-creating or order-placing case

No case may leave orphaned data on the shared public site. Applied
per-case, following each case's own official script:

- **Cases whose official steps themselves end in "Delete Account" /
  "ACCOUNT DELETED!"** (1, 2, 14, 15, 16, 23, 24): the test performs that
  UI step and asserts on it directly, exactly as scripted. For the ones
  that use `apiAccount` (2, 16, 23), the fixture's own teardown becomes a
  harmless no-op safety net (a second `deleteAccount` call against an
  already-deleted account fails silently, caught and warned, never
  asserted).
- **Cases using `apiAccount` whose official script does *not* itself
  delete the account** (4, 5, 20, 21): cleanup relies on the fixture's
  built-in `DELETE /api/deleteAccount` teardown, since there is no UI
  opportunity to do it in-script. Correction from an earlier draft of this
  plan: case 5's official script ("Register User with existing email")
  never reaches a logged-in state at all — it ends at the "Email Address
  already exist!" error, with no Delete Account step to perform or assert
  on. Only case 5's *pre-existing setup account* (provisioned via
  `apiAccount` so there's an email to collide with) exists and needs
  cleanup; it is never touched through the UI, so the fixture's API-side
  teardown is the only cleanup path — do not fabricate a UI delete step for
  it, that would break the exact-fidelity-to-the-official-script premise
  this phase is graded on.
- **Cases that create no account at all** (3, 6–13, 17–19, 22, 25, 26):
  nothing to clean up. Guest carts are per-context and are not persisted
  server-side beyond the test's own browser context.
- **Order records left by 14, 15, 16, 24**: the documented API has no
  delete-order capability, so a placed (fake-payment) order is not cleaned
  up — accepted as out of scope for hygiene, consistent with
  `test-strategy.md`'s existing framing that this data is fictitious demo
  data with no real payment/PII behind it, same as the account address
  fields already accepted as fixed dummy values.

### Risks / assumptions to verify live during implementation

Flagging these now rather than guessing further in this document — none
block planning, all are cheap to confirm with one real browser run before
or during implementation:

- Exact wording/heading level of the checkout success message and the
  Address Details / Review Your Order section markup (`CheckoutPage`
  locators) — could not be fetched via `curl` since `/checkout` requires
  an authenticated session; assertions should use `toContainText` against
  the official steps' quoted text rather than an exact/full-string match,
  consistent with how `checkout-gating.spec.ts` already asserts the modal
  copy.
- "Download Invoice" behavior in a headless Playwright context — needs
  `page.waitForEvent('download')` around the click; confirm it actually
  fires a `download` event rather than navigating to a rendered page.
- Native `window.confirm()` dialog timing on Contact Us submit — confirm
  registering `page.once('dialog', ...)` before the click reliably beats
  the dialog (already the intended handling above; verify a race doesn't
  slip through headless).
- Whether case 22's recommended-item add-to-cart really shares the global
  `#cartModal` (noted above under the `CartConfirmationModal` decision).
- Case 18's exact resulting heading text when a **Men** subcategory is
  clicked (the Women→"WOMEN - TOPS PRODUCTS" quirk for any Women
  subcategory is already confirmed in the ground truth; the equivalent for
  Men is not specified there) — plan to assert on URL/breadcrumb
  (`/category_products/\d+` plus a heading containing the clicked
  category's own link text) rather than inventing a specific expected
  string.
- Case 19's exact brand-page heading format — assert it contains the
  clicked brand's name (case-insensitive) rather than a fully pinned
  string, for the same reason.
- Cross-browser stability of dialog handling (case 6) and file download
  (case 24) specifically on WebKit, which has historically been the
  flakiest Playwright engine for both; spot-check on Chromium first during
  implementation before trusting the Firefox/WebKit runs. This is a
  verification note, not a proposal to change the existing three-project
  config.

### Out-of-scope / deferred

None of the 26 cases are excluded or deferred — closing the gap to 26/26
is this phase's entire point, and nothing in the official list requires
unsafe behavior (the payment step is confirmed fake per
`test-strategy.md`). Everything this plan does not cover remains whatever
`docs/test-strategy.md`'s existing "Intentional exclusions" section already
lists (real payment gateways, email delivery, performance, security,
visual regression, exhaustive field matrices) — not re-litigated here.

### Ordered tasks

1. **Shared scaffolding** — `tests/pages/CheckoutPage.ts`, `tests/pages/ContactUsPage.ts`,
   `tests/pages/CartConfirmationModal.ts`, `tests/pages/SubscriptionFooter.ts`,
   `tests/e2e/data/sample-upload.txt`, and the `apiAccount` fixture +
   `TestAccount` type in `tests/fixtures/fixtures.ts`. Everything below depends
   on this.
   - Validation: `tsc --noEmit` passes; no assertions in the new Page
     Object files.
2. **Extend existing Page Objects** — `SignupLoginPage`, `ProductsPage`,
   `ProductDetailPage`, `CartPage`, `HomePage` per the breakdown above,
   including wiring the new `SubscriptionFooter`/`CartConfirmationModal`
   instances into `HomePage`/`CartPage`/`ProductsPage`.
   - Validation: `tsc --noEmit` passes; existing Phase 1 E2E tests still
     pass unmodified (no behavior change to existing locators/methods).
3. **Auth domain** — rename+extend `registration.spec.ts` (case 1: add
   newsletter/offers checkboxes, exact title); create `login.spec.ts`
   (cases 2–5).
4. **Contact Us** — `contact-us.spec.ts` (case 6).
5. **Navigation** — `navigation.spec.ts` (cases 7, 18, 19).
6. **Product discovery/detail** — extend `product-details.spec.ts` (cases
   8, 9, 21), placed after the existing search/detail-match test and F3
   regression.
7. **Subscription** — `subscription.spec.ts` (cases 10, 11).
8. **Cart** — extend `cart.spec.ts` (cases 12, 13, 17, 20, 22), placed
   after the existing qty-2 happy path and F1 regression.
9. **Checkout/order placement** — `checkout.spec.ts` (cases 14, 15, 16,
   23, 24). Highest setup cost in this phase; do last among the spec
   files so `CheckoutPage` and `apiAccount` are already proven by simpler
   specs first.
10. **Scroll** — `scroll.spec.ts` (cases 25, 26).
11. **README refresh** — update the coverage description to state 26/26
    official cases are covered, and add `tests/pages/CheckoutPage.ts`,
    `tests/pages/ContactUsPage.ts`, `tests/pages/CartConfirmationModal.ts`, and
    `tests/pages/SubscriptionFooter.ts` to the Page Objects list.
12. **Final validation** — `npm run typecheck && npm test` (all three
    browser projects); grep every new `test(` title against the 26
    official titles for an exact 1:1 match; confirm no test depends on
    execution order; spot-check that a sampled test-run's account email
    now 404s from `getUserDetailByEmail` (proves cleanup actually ran,
    not just that the test asserted its own success).
13. **CI** — no functional change expected (same as Phase 1's note);
    confirm `.github/workflows/playwright.yml` still runs everything and
    stays green given the added test count (~78 executions across 3
    browser projects instead of the smaller Phase 1 set).

No optional/nice-to-have items are proposed for this phase — the phase's
entire scope is closing a required, already-decided gap (26/26), so there
is nothing here to defer behind "optional." Phase 1's own optional section
above is unaffected.

## Phase 3: Edge cases, domain tags, and containerized execution

Scope: three follow-up changes made after Phase 2, none of which touch the
26 official cases or their content — closes gaps the earlier phases either
deferred or didn't anticipate.

### Edge-cases extraction and new coverage

`tests/e2e/checkout-gating.spec.ts` and the F1/F3 `test.fail()` regression
tests (previously inline in `cart.spec.ts` and `product-details.spec.ts`
respectively) were moved into a dedicated `tests/e2e/edge-cases/` folder,
renamed to match their content:

- `tests/e2e/edge-cases/checkout-gating.spec.ts` (unchanged content, moved)
- `tests/e2e/edge-cases/cart-negative-quantity.spec.ts` (was the F1 test)
- `tests/e2e/edge-cases/product-not-found.spec.ts` (was the F3 test)

Two new tests were added to the same folder:

- `tests/e2e/edge-cases/empty-cart-checkout.spec.ts` — F6, a `test.fail()`
  regression: checking out with an empty cart currently confirms a real
  order (`/payment_done/0`, Rs. 0) instead of being blocked. Same pattern
  as F1/F3 — encodes the desired (currently-false) behavior rather than
  asserting the bug as correct.
- `tests/api/edge-cases/case-sensitive-login.spec.ts` — F7, a **normal
  passing** test (no `test.fail()`): pins that `verifyLogin` is
  case-sensitive on the registered email as documented, current behavior —
  `docs/exploratory-testing.md`'s own recommendation treats this as a
  usability note to record, not a defect to flag as failing.

None of Phase 1/Phase 2's non-bonus files were touched beyond removing the
extracted tests; `cart.spec.ts` and `product-details.spec.ts` keep their
official-case tests exactly as before.

### Domain tagging

Every test — API and E2E — is tagged via Playwright's native `{ tag: [...]
}` option (no custom tagging layer). One tag per domain, reused across
layers where the same domain exists at both: `@cart`, `@login`,
`@checkout`, `@product`, `@brand`, `@search`, `@account`, `@registration`,
`@subscription`, `@navigation`, `@contact`, `@scroll`, `@smoke`, plus
`@edge-case` applied to all five files above (in addition to their domain
tag). `@login`, for example, is on `tests/api/login-negative.spec.ts`,
`tests/api/edge-cases/case-sensitive-login.spec.ts`, and
`tests/e2e/login.spec.ts`, so `npx playwright test --grep @login` runs all
three together. See `README.md` for the full tag table and filtering
examples.

### Containerized execution

A `Dockerfile` at the repo root, based on
`mcr.microsoft.com/playwright:v1.63.0-jammy` (pinned to match the
installed `@playwright/test` version, 1.63.0, so the bundled
Chromium/Firefox/WebKit line up with what the config expects) — copies
`package.json`/`package-lock.json`, runs `npm ci`, copies the rest of the
repo, and defaults to a new `test:container` script
(`playwright test --project=api --project=chromium`). A `.dockerignore`
excludes `node_modules`, `playwright-report`, `test-results`, `.git`,
`.claude`, `CLAUDE.md`, and `.env`.

`test:container` (api + chromium only, not the full cross-browser suite)
is the container's default because firefox/webkit roughly double the run
time inside a container with no host GPU/font-cache warmup, for coverage
that's already exercised the same way on every local run — the full suite
stays one `docker run --rm <image> npm test` away for anyone who needs
firefox/webkit signal.

`.github/workflows/playwright.yml` was changed from installing Node and
Playwright browsers natively to building this same Dockerfile and running
`typecheck && test:container` inside it, mounting `playwright-report/`
from the host so the existing failure-artifact upload step keeps working
unchanged. `docker run` doesn't forward the runner's environment by
default, and `playwright.config.ts` reads `process.env.CI` for
retries/workers/`forbidOnly`, so the workflow passes `-e CI=true`
explicitly — without it, CI would silently run with local (non-CI)
settings.

### Bug fix: `test:ui` / `test:ui-api` were missing `--ui`

Both npm scripts existed but ran `playwright test --project=...` without
the `--ui` flag, so neither actually opened Playwright's interactive UI
mode despite their names (a change introduced in an earlier, unrequested
commit — see project history). Fixed to
`playwright test --project=chromium --ui` and
`playwright test --project=chromium --project=api --ui` respectively.

No optional/nice-to-have items are proposed for this phase either — each
of the three changes above was a direct, explicit request, not a
discretionary addition.
