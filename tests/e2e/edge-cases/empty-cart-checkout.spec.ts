import { test, expect } from '../../fixtures/fixtures';

test(
  'checking out with an empty cart should not confirm an order (regression for exploratory finding F6)',
  { tag: ['@checkout', '@edge-case'] },
  async ({ signupLoginPage, checkoutPage, apiAccount }) => {
    // test.fail() marks the WHOLE test as expected-to-fail, so this test is
    // kept minimal and tightly scoped to the one known defect.
    // See docs/exploratory-testing.md F6: checkout confirms a real order for
    // an empty cart instead of blocking it.
    test.fail();

    await signupLoginPage.goto();
    await signupLoginPage.login(apiAccount.email, apiAccount.password);

    await checkoutPage.goto();
    await checkoutPage.completeOrder('Empty cart checkout - F6 regression check.');

    await expect(checkoutPage.confirmationMessage).not.toBeVisible();
  },
);
