# SDET Technical Assignment

## Purpose

This repository contains a time-boxed Senior QA / SDET technical assignment.

The system under test is https://automationexercise.com and its public API.

The assignment evaluates:

- test strategy and prioritization
- API automation
- end-to-end automation
- TypeScript and Playwright design
- test architecture and maintainability
- exploratory testing
- CI/CD readiness
- communication of assumptions, risks, decisions, and tradeoffs

The total intended effort is 3–5 hours. Optimize for engineering judgment, clarity, and quality rather than completeness.

## Required technology

Use:

- TypeScript
- Playwright
- Playwright Test
- Node.js

Use Playwright for both API and browser automation.

Do not introduce another test framework unless explicitly requested.

## Primary engineering principle

Keep the solution simple.

Prefer the smallest design that is clear, maintainable, stable, and appropriate for the current scope.

Do not build a large automation framework for a small interview assignment.

Patterns must solve an actual problem. Do not introduce abstractions only to demonstrate knowledge of design patterns.

## Design guidelines

Prefer:

- clear separation between API tests and E2E tests
- reusable fixtures only when they remove meaningful duplication
- small helpers with explicit responsibilities
- Page Objects or component objects only for repeated or complex UI interactions
- API clients only when they improve readability or reuse
- descriptive test names
- focused assertions
- deterministic test data where possible
- independent tests
- stable Playwright locators
- configuration through Playwright config and environment variables
- TypeScript strictness
- minimal dependencies

Avoid:

- unnecessary base classes
- inheritance-heavy frameworks
- generic utility layers
- speculative abstractions
- wrappers around Playwright without a concrete benefit
- arbitrary waits or sleeps
- brittle CSS/XPath selectors when semantic locators are available
- shared mutable test state
- test-order dependencies
- excessive comments explaining obvious code
- implementing optional features before required work is complete

## Quality priorities

Prioritize testing based on customer and business risk.

For this e-commerce application, give particular attention to flows such as:

- account/user behavior where relevant
- product discovery
- product details
- cart behavior
- checkout-related paths that can be exercised safely
- important API capabilities
- validation and negative API behavior

Do not attempt exhaustive coverage.

A small number of well-selected tests is preferable to many shallow tests.

## API vs E2E philosophy

Prefer API tests when validating:

- request/response contracts
- status codes
- validation behavior
- positive and negative data scenarios
- API business rules
- scenarios that do not require browser behavior

Prefer E2E tests when validating:

- critical user journeys
- browser/application integration
- navigation and UI state
- important cross-layer workflows
- behavior that cannot be adequately proven at the API layer

Avoid duplicating the same coverage at both layers without a clear reason.

## Documentation

The repository should eventually contain concise documentation for:

- test strategy
- assumptions
- risks and constraints
- intentional exclusions
- exploratory testing charter and findings
- implementation decisions and tradeoffs
- installation and execution
- CI/CD approach
- improvements that would be made with more time

Keep documentation concise and evidence-based.

## Expected workflow

Use the specialized agents in this order when appropriate:

1. `qa-analysis-documentation`
   - analyze the assignment and the application
   - create or refine test strategy and supporting QA documentation

2. `test-planner`
   - read the documentation and repository state
   - produce a small, prioritized implementation plan

3. `typescript-architect`
   - review proposed architecture and important TypeScript/Playwright design decisions
   - simplify the design when possible

4. `implementation-engineer`
   - implement the approved plan
   - execute tests and fix issues

Do not delegate trivial tasks unnecessarily.

## Working rules

Before implementing substantial code:

1. inspect the repository
2. read the relevant documentation
3. understand the current plan
4. make the smallest appropriate change
5. run the relevant validation/tests

Never silently change the assignment requirements.

Never invent behavior of the application. Verify it first when practical.

If behavior is uncertain, document the assumption.

If the timebox forces a tradeoff, prioritize the highest-value work and document what was intentionally left out.

## Definition of done

A change is complete when:

- the implementation is understandable without excessive explanation
- relevant tests pass
- TypeScript compiles successfully
- no unnecessary abstraction was introduced
- documentation reflects important decisions or tradeoffs
- a reviewer can understand how to install and run the solution
