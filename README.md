# Sokin Assignment - Playwright + TypeScript Automation

Playwright + TypeScript automation suite for
[automationexercise.com](https://automationexercise.com) and its public API,
built for a time-boxed SDET technical assignment. This commit establishes the
framework foundation: configuration, one Page Object, one fixture, and one
smoke test per layer (API and E2E) proving the setup works end to end. Real
business-scenario coverage is added on top of this foundation separately.

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
pages/          # Page Objects (only where they reduce real duplication)
fixtures/       # test.extend fixtures shared across specs
docs/           # test strategy and related decisions
```

- `tests/api` - request/response contract and business-rule tests against the
  public API.
- `tests/e2e` - critical user-journey and browser/UI tests.
- `pages` - Page Objects for repeated or non-trivial UI interactions.
- `fixtures` - shared, meaningful test setup exposed via `test.extend`.
- `docs` - test strategy and recorded architecture decisions.

## Architecture decisions

See [`docs/test-strategy.md`](docs/test-strategy.md) for the reasoning
behind not adding a `BrowserFactory`, `ApiClient`, `BasePage`, or ESLint at
this stage, and for the verified API quirk (`responseCode` in the body vs.
HTTP status) that the API smoke test explicitly guards against.

## CI

`.github/workflows/playwright.yml` runs on push/PR: install, `typecheck`,
then the full test suite, uploading the HTML report only on failure.
