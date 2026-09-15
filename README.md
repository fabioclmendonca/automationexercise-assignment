# Sokin Assignment - Playwright + TypeScript Automation

Playwright + TypeScript automation suite for
[automationexercise.com](https://automationexercise.com) and its public API,
built for a time-boxed SDET technical assignment. It covers the API's
documented contracts and validation behavior (products/brands, search,
login, and a full account create/verify/update/delete lifecycle), the
highest-risk end-to-end user journeys (registration, product discovery and
details, cart, and the checkout login gate), two deliberate `test.fail()`
regression tests that document confirmed defects found during exploratory
testing rather than asserting buggy behavior as correct, and **all 26 of
the officially published test cases** from
[automationexercise.com/test_cases](https://automationexercise.com/test_cases)
(each automated with that case's exact official title, so the suite can be
cross-checked 1:1 against the public list). See `docs/test-strategy.md`,
`docs/exploratory-testing.md`, and `docs/implementation-plan.md` for the
reasoning behind what is (and isn't) covered.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm

## Install

```bash
npm install
npx playwright install
```

(Optionally copy `.env.example` to `.env` to override `BASE_URL` /
`API_BASE_URL`; the suite runs against the public site with zero setup
otherwise.)

## Running tests

```bash
npm test               # everything (api + chromium + firefox + webkit)
npm run test:api       # API project only
npm run test:e2e       # e2e, all three browser projects
npm run test:e2e:headed
npm run test:ui        # Playwright UI mode
npm run typecheck      # tsc --noEmit
```

## Project structure

```text
tests/
  api/          # Playwright APIRequestContext tests
  e2e/          # Playwright browser tests
    data/       # static test fixtures (files), e.g. the Contact Us upload
  pages/        # Page Objects (only where they reduce real duplication)
  fixtures/     # test.extend fixtures shared across specs
docs/           # test strategy and related decisions
```

Everything test-related lives under `tests/` - specs, Page Objects, and
Playwright fixtures alike - rather than spreading `pages/`/`fixtures/`
across the repo root. `tests/e2e/data/` (static files a test needs, like
an upload sample) is kept separate from `tests/fixtures/` (Playwright's
`test.extend` mechanism) since the two "fixture" concepts are unrelated
despite the naming overlap in the wild.

- `tests/api` - request/response contract and business-rule tests against the
  public API (products/brands, search, login negative paths, and the full
  account lifecycle).
- `tests/e2e` - critical user-journey and browser/UI tests, including all 26
  official test cases (registration/login, contact us, navigation, product
  discovery/details, subscription, cart, checkout/order placement, scroll
  behavior) plus checkout gating and the two `test.fail()` regressions.
- `tests/pages` - Page Objects for repeated or non-trivial UI interactions
  (`HomePage`, `SignupLoginPage`, `ProductsPage`, `ProductDetailPage`,
  `CartPage`, `CheckoutPage`, `ContactUsPage`, `CartConfirmationModal`,
  `SubscriptionFooter`).
- `tests/fixtures` - shared, meaningful test setup exposed via `test.extend`,
  including the `apiAccount` fixture (provisions a unique account via the
  API for tests where login/account state is a precondition, not the thing
  under test, and best-effort deletes it afterwards).
- `docs` - test strategy, exploratory testing findings, the implementation
  plan, and recorded architecture decisions:
  - [`docs/test-strategy.md`](docs/test-strategy.md) - approach,
    priorities, API vs. E2E decisions, risks, and assumptions.
  - [`docs/exploratory-testing.md`](docs/exploratory-testing.md) - the
    exploratory session and concrete findings (F1-F5) referenced by several
    tests.
  - [`docs/implementation-plan.md`](docs/implementation-plan.md) - the
    prioritized, scenario-level plan this suite was built from.

## Architecture decisions

See [`docs/test-strategy.md`](docs/test-strategy.md) for the reasoning
behind not adding a `BrowserFactory`, `ApiClient`, `BasePage`, or ESLint at
this stage, and for the verified API quirk (`responseCode` in the body vs.
HTTP status) that every API test explicitly guards against.

## CI

`.github/workflows/playwright.yml` runs on push/PR: install, `typecheck`,
then the full test suite, uploading the HTML report only on failure.
