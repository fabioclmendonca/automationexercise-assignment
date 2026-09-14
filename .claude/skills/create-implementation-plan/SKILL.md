---
name: create-implementation-plan
description: Turn the existing QA strategy and repository state into a small, prioritized implementation plan for the TypeScript/Playwright assignment.
disable-model-invocation: true
---

Create or update the implementation plan.

## Inputs

Read:

- `CLAUDE.md`
- existing QA/test strategy documentation
- current repository structure and configuration

## Plan requirements

Produce an ordered plan covering only work needed for a strong submission.

For each task include:

- goal
- files likely affected
- acceptance/validation condition

For each automated test scenario include:

- API or E2E
- scenario
- reason for inclusion
- main validation

## Planning rules

- Required assignment work before optional work.
- Keep architecture minimal.
- Do not create abstractions without demonstrated reuse.
- Avoid duplicate API and E2E coverage.
- Keep the plan realistic for a 3–5 hour assignment.
- Explicitly list items that are intentionally out of scope.
- Put optional enhancements in a separate final section.

The implementation agent should be able to follow the plan sequentially without having to invent a new architecture.
