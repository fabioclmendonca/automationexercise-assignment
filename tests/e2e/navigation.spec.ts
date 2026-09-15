import { test, expect } from '../fixtures/fixtures';

// Some brand names contain regex-special characters (e.g. "&"); this keeps
// the dynamically-captured brand/subcategory name safe to embed in a RegExp
// used for a case-insensitive heading match.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('navigation', () => {
  test('Test Case 7: Verify Test Cases Page', async ({ homePage, page }) => {
    await homePage.goto();
    await expect(homePage.featuresItemsHeading).toBeVisible();

    // Scoped to the header nav - the homepage hero also has its own
    // "Test Cases" promo button with the same accessible name.
    await page.locator('header').getByRole('link', { name: 'Test Cases' }).click();

    // A longer timeout: the live site's ad network occasionally delays
    // outbound navigation with an interstitial (confirmed live).
    await expect(page).toHaveURL(/\/test_cases$/, { timeout: 15_000 });
  });

  test('Test Case 18: View Category Products', async ({ homePage, productsPage, page }) => {
    await homePage.goto();
    await expect(productsPage.womenToggle).toBeVisible();
    await expect(productsPage.menToggle).toBeVisible();

    await productsPage.expandCategory(productsPage.womenToggle, 'Women');
    const womenSubcategory = productsPage.subcategoryLink('Women', 'Dress');
    const womenSubcategoryName = (await womenSubcategory.innerText()).trim();
    await productsPage.clickSubcategory(womenSubcategory);

    await expect(page).toHaveURL(/\/category_products\/\d+/);
    await expect(page.locator('h2.title.text-center')).toContainText(
      new RegExp(escapeRegExp(womenSubcategoryName), 'i'),
    );

    // The sidebar is rendered identically on category pages (confirmed
    // live), so the Men accordion can be operated from here directly.
    await productsPage.expandCategory(productsPage.menToggle, 'Men');
    const menSubcategory = productsPage.subcategoryLink('Men', 'Tshirts');
    const menSubcategoryName = (await menSubcategory.innerText()).trim();
    await productsPage.clickSubcategory(menSubcategory);

    await expect(page).toHaveURL(/\/category_products\/\d+/);
    await expect(page.locator('h2.title.text-center')).toContainText(
      new RegExp(escapeRegExp(menSubcategoryName), 'i'),
    );
  });

  test('Test Case 19: View & Cart Brand Products', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.productsNavLink.click();
    // A longer timeout: the live site's ad network occasionally delays
    // outbound navigation with an interstitial (confirmed live).
    await expect(page).toHaveURL(/\/products$/, { timeout: 15_000 });

    const brandLinks = page.locator('.brands-name a');
    await expect(brandLinks.first()).toBeVisible();

    const firstBrandName = (await brandLinks.nth(0).innerText()).replace(/\(\d+\)/, '').trim();
    await brandLinks.nth(0).click();
    await expect(page).toHaveURL(/\/brand_products\//);
    await expect(page.locator('h2.title.text-center')).toContainText(
      new RegExp(escapeRegExp(firstBrandName), 'i'),
    );

    const secondBrandName = (await brandLinks.nth(1).innerText()).replace(/\(\d+\)/, '').trim();
    await brandLinks.nth(1).click();
    await expect(page).toHaveURL(/\/brand_products\//);
    await expect(page.locator('h2.title.text-center')).toContainText(
      new RegExp(escapeRegExp(secondBrandName), 'i'),
    );
  });
});
