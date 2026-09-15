import { test, expect } from '../fixtures/fixtures';

test.describe('subscription', () => {
  test('Test Case 10: Verify Subscription in home page', async ({ homePage }) => {
    await homePage.goto();
    await homePage.subscriptionFooter.heading.scrollIntoViewIfNeeded();
    await expect(homePage.subscriptionFooter.heading).toBeVisible();

    await homePage.subscriptionFooter.subscribe(`sdet.subscribe.home.${Date.now()}@example.com`);

    await expect(homePage.subscriptionFooter.successMessage).toBeVisible();
  });

  test('Test Case 11: Verify Subscription in Cart page', async ({ cartPage }) => {
    await cartPage.goto();
    await cartPage.subscriptionFooter.heading.scrollIntoViewIfNeeded();
    await expect(cartPage.subscriptionFooter.heading).toBeVisible();

    await cartPage.subscriptionFooter.subscribe(`sdet.subscribe.cart.${Date.now()}@example.com`);

    await expect(cartPage.subscriptionFooter.successMessage).toBeVisible();
  });
});
