import { test, expect } from '../../fixtures/fixtures';

test.describe('smoke', () => {
  test('homepage loads and shows the features items section', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.featuresItemsHeading).toBeVisible();
  });
});
