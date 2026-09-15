import { test, expect } from '../../fixtures/fixtures';

test.describe('scroll behavior', () => {
  test("Test Case 25: Verify Scroll Up using 'Arrow' button and Scroll Down functionality", async ({
    homePage,
  }) => {
    await homePage.goto();
    await homePage.scrollToBottom();
    await expect(homePage.subscriptionFooter.heading).toBeVisible();

    await homePage.scrollUpArrow.click();

    // A slightly longer timeout: the homepage hero carousel periodically
    // re-renders its slides (confirmed live), which can cause a transient
    // miss on the very first poll.
    await expect(homePage.heroHeading).toBeInViewport({ timeout: 10_000 });
  });

  test("Test Case 26: Verify Scroll Up without 'Arrow' button and Scroll Down functionality", async ({
    homePage,
  }) => {
    await homePage.goto();
    await homePage.scrollToBottom();
    await expect(homePage.subscriptionFooter.heading).toBeVisible();

    await homePage.scrollToTopWithoutButton();

    // A slightly longer timeout: the homepage hero carousel periodically
    // re-renders its slides (confirmed live), which can cause a transient
    // miss on the very first poll.
    await expect(homePage.heroHeading).toBeInViewport({ timeout: 10_000 });
  });
});
