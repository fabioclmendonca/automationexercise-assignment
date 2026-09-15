# Sokin Assignment - Playwright + TypeScript Automation

Playwright + TypeScript automation suite for
[automationexercise.com](https://automationexercise.com) and its public API,
built for a technical assignment. It covers the API's
documented contracts and validation behavior (products/brands, search,
login, and a full account create/verify/update/delete lifecycle), the
highest-risk end-to-end user journeys (registration, product discovery and
details, cart, and the checkout login gate), a small `tests/*/edge-cases/`
set of extra QA-identified coverage - including deliberate `test.fail()`
regression tests that document confirmed defects found during exploratory
testing rather than asserting buggy behavior as correct - and **all 26 of
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
npm run test:ui        # Playwright UI mode (chromium)
npm run test:ui-api    # Playwright UI mode (chromium + api)
npm run test:container # api + chromium only - the container/CI default (see below)
npm run typecheck      # tsc --noEmit
```

### Running by domain tag

Every test is tagged by domain (`@cart`, `@login`, `@checkout`, `@product`,
`@brand`, `@search`, `@account`, `@registration`, `@subscription`,
`@navigation`, `@contact`, `@scroll`, `@smoke`, plus `@edge-case` for the
QA-added coverage in `tests/*/edge-cases/`) using Playwright's native tag
support - no custom tagging layer. Where a domain exists at both layers
(e.g. login), the same tag is used on both the API and E2E tests, so one
filter runs both:

```bash
npx playwright test --grep @cart              # only cart tests
npx playwright test --grep "@login|@checkout" # login OR checkout tests
npx playwright test --grep @edge-case         # only the QA-added edge cases
```

### Viewing the HTML report

After any run (`npm test`, `npm run test:e2e`, a tag-filtered run, etc.),
open the HTML report that was just generated:

```bash
npx playwright show-report
```

This opens `playwright-report/index.html` in a browser, with a
pass/fail/skip breakdown per test, traces, and screenshots for anything
that failed or was retried.

## Running in Docker

The `Dockerfile` at the repo root is based on
`mcr.microsoft.com/playwright:v1.63.0-jammy` - it already bundles
Chromium, Firefox, and WebKit plus every OS dependency they need, so no
extra install step is required (the tag must match the `@playwright/test`
version in `package.json`; bump both together when upgrading).

```bash
docker build -t automationexercise-tests .

# api + chromium only (the default CMD, npm run test:container) - a fast,
# still-meaningful gate without the extra time of firefox/webkit in a
# container with no host GPU/font-cache warmup:
docker run --rm automationexercise-tests

# Full cross-browser suite on demand:
docker run --rm automationexercise-tests npm test

# Any other script works the same way, e.g. API-only:
docker run --rm automationexercise-tests npm run test:api

# Get the HTML report onto the host by mounting the output directory:
docker run --rm -v "$(pwd)/playwright-report:/app/playwright-report" automationexercise-tests
npx playwright show-report

# Override BASE_URL/API_BASE_URL the same way you would locally:
docker run --rm -e BASE_URL=https://example.com automationexercise-tests
```

This is the same image `.github/workflows/playwright.yml` builds and runs
in CI, so a green run locally in Docker means CI will see the same result
(CI also defaults to `test:container`; the full suite is a manual/on-demand
run, not part of the CI gate).

## Project structure

```text
tests/
  api/          # Playwright APIRequestContext tests
    edge-cases/ # extra QA-identified API coverage (see below)
  e2e/          # Playwright browser tests
    data/       # static test fixtures (files), e.g. the Contact Us upload
    edge-cases/ # extra QA-identified E2E coverage (see below)
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
  - `tests/api/edge-cases` - extra QA-identified API coverage beyond the
    documented endpoints above: currently the case-sensitive-login test
    pinning finding F7. Kept visually separate from the "official" API
    coverage rather than mixed into the same files.
- `tests/e2e` - critical user-journey and browser/UI tests, including all 26
  official test cases (registration/login, contact us, navigation, product
  discovery/details, subscription, cart, checkout/order placement, scroll
  behavior).
  - `tests/e2e/edge-cases` - extra QA-identified E2E coverage beyond the 26
    official cases and the original risk-based scope: checkout gating for
    guests, and the `test.fail()` regressions for findings F1 (negative cart
    quantity), F3 (non-existent product ID), and F6 (empty-cart checkout).
    Kept in their own folder so this bonus coverage stays visually distinct
    from the official test cases.
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
    exploratory sessions and concrete findings (F1-F7) referenced by several
    tests.
  - [`docs/implementation-plan.md`](docs/implementation-plan.md) - the
    prioritized, scenario-level plan this suite was built from.

## Architecture decisions

See [`docs/test-strategy.md`](docs/test-strategy.md) for the reasoning
behind not adding a `BrowserFactory`, `ApiClient`, `BasePage`, or ESLint at
this stage, and for the verified API quirk (`responseCode` in the body vs.
HTTP status) that every API test explicitly guards against.

## CI

`.github/workflows/playwright.yml` runs on push/PR: builds the same
`Dockerfile` described above, runs `typecheck` and `npm run test:container`
(api + chromium) inside that container (with `CI=true` passed through
explicitly, since `docker run` doesn't forward the runner's environment by
default and `playwright.config.ts` uses that variable for retries/workers),
and uploads the HTML report only on failure. The full cross-browser suite
isn't part of the CI gate - run it on demand locally (see "Running in
Docker" above) when firefox/webkit coverage needs checking.
