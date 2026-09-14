---
name: typescript-playwright-standards
description: Project standards for simple, maintainable TypeScript and Playwright test automation. Use whenever designing, implementing, or reviewing automated tests in this repository.
---

# TypeScript and Playwright Standards

## Guiding rule

Prefer simple, explicit Playwright code over framework abstractions.

## TypeScript

- Keep TypeScript strict.
- Prefer explicit domain types where they improve correctness.
- Avoid `any`.
- Prefer small interfaces/types close to where they are used.
- Do not create type hierarchies without a demonstrated need.
- Prefer composition over inheritance.

## Playwright tests

- Keep tests independent.
- Use `test.describe` only when grouping adds clarity or shared configuration.
- Use fixtures for meaningful reusable setup, not simply to move code elsewhere.
- Use Playwright auto-waiting rather than sleeps.
- Keep assertions close to the behavior they validate.
- Prefer focused assertions over snapshots of large payloads.

## API tests

- Use Playwright's APIRequestContext.
- Separate request construction from assertions when reuse makes that clearer.
- Validate contract and behavior that matter to the scenario.
- Include meaningful negative coverage.
- Avoid repeating identical coverage through the UI.

## E2E tests

Prefer resilient user-facing locators:

- `getByRole`
- `getByLabel`
- `getByPlaceholder`
- stable `getByText`
- `getByTestId` when available

Use CSS only when needed.

Avoid XPath unless there is no reasonable alternative.

## Page Objects

Use Page Objects only when they reduce meaningful duplication or improve readability.

Keep assertions in tests by default. Put assertions inside Page Objects only when the assertion represents a reusable component invariant and doing so clearly improves the design.

Avoid one class per page as a rule.

## Helpers

A helper should have a narrow responsibility.

Do not create generic `utils.ts` dumping grounds.

Prefer names that describe the domain purpose.

## Project structure

Keep folder depth shallow.

A reasonable structure may look like:

```text
tests/
  api/
  e2e/
pages/          # only if justified
api/            # only if justified
fixtures/       # only if justified
```

Do not create empty architecture layers in anticipation of future needs.

## Review test

Before adding an abstraction, ask:

1. Is there real duplication?
2. Does this make the test easier to understand?
3. Will a reviewer immediately understand why it exists?
4. Is the abstraction simpler than the code it replaces?

If not, keep the direct implementation.
