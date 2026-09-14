---
name: create-test-strategy
description: Analyze the SDET assignment and create or refine a concise, risk-based test strategy covering priorities, API vs E2E decisions, assumptions, constraints, risks, and intentional exclusions.
disable-model-invocation: true
---

Create or refine the test strategy for this assignment.

## Process

1. Read `CLAUDE.md`.
2. Inspect existing repository documentation.
3. Inspect the system/application and API information available to you when practical.
4. Identify critical e-commerce capabilities and risks.
5. Prioritize a deliberately small set of coverage.
6. Decide which risks should be tested through API automation and which require E2E.
7. Record assumptions, constraints, and intentional exclusions.

## Required content

The strategy must explain:

- testing approach
- priorities and rationale
- API vs E2E coverage decisions
- key risks
- assumptions
- constraints
- intentional exclusions
- important residual risks

## Quality bar

Be concise.

Every important proposed test should have a reason.

Do not produce an exhaustive test-case catalog.

Avoid generic statements that could apply to any website.

Make tradeoffs visible.

Where information is uncertain, label it as an assumption rather than presenting it as fact.
