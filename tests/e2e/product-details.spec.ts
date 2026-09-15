import { test, expect } from '../fixtures/fixtures';

// The live site's ad network occasionally wraps a word of a product name in
// an inline annotation element, which introduces extra whitespace without
// changing the words themselves. Normalizing whitespace keeps name/price
// comparisons resilient to that rather than pinned to raw markup.
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

test.describe('product details', { tag: '@product' }, () => {
  test('discovering a product via search shows the same name and price as the catalog card', async ({
    productsPage,
    productDetailPage,
  }) => {
    await productsPage.goto();

    const firstCard = productsPage.productCards.first();
    const name = normalize(await productsPage.nameFor(firstCard).innerText());
    const price = normalize(await productsPage.priceFor(firstCard).innerText());

    // Search using a substring of the captured name - not a hardcoded
    // catalog value - so this stays valid if the catalog changes.
    const searchTerm = name.split(' ')[0];
    await productsPage.search(searchTerm);

    const matchingCard = productsPage.cardByName(name).first();
    await expect(matchingCard).toBeVisible();
    await productsPage.viewProductLinkFor(matchingCard).click();

    await expect(productDetailPage.productName).toBeVisible();
    expect(normalize(await productDetailPage.productName.innerText())).toBe(name);
    expect(normalize(await productDetailPage.productPrice.innerText())).toBe(price);
  });

  test('Test Case 8: Verify All Products and product detail page', async ({
    homePage,
    productsPage,
    productDetailPage,
    page,
  }) => {
    await homePage.goto();
    await homePage.productsNavLink.click();

    // A longer timeout: the live site's ad network occasionally delays
    // outbound navigation with an interstitial (confirmed live).
    await expect(page).toHaveURL(/\/products$/, { timeout: 15_000 });
    await expect(page.locator('h2.title.text-center')).toContainText(/all products/i);
    await expect(productsPage.productCards.first()).toBeVisible();

    const firstCard = productsPage.productCards.first();
    await productsPage.viewProductLinkFor(firstCard).click();

    await expect(productDetailPage.productName).toBeVisible();
    await expect(productDetailPage.categoryText).toContainText('Category:');
    await expect(productDetailPage.productPrice).toBeVisible();
    await expect(productDetailPage.availabilityText).toContainText('Availability:');
    await expect(productDetailPage.conditionText).toContainText('Condition:');
    await expect(productDetailPage.brandText).toContainText('Brand:');
  });

  test('Test Case 9: Search Product', async ({ productsPage, page }) => {
    await productsPage.goto();

    const referenceCard = productsPage.productCards.first();
    const referenceName = normalize(await productsPage.nameFor(referenceCard).innerText());
    // Search by a substring of a real catalog name rather than a hardcoded
    // value, so this stays valid if the catalog changes.
    const searchTerm = referenceName.split(' ')[0];

    await productsPage.search(searchTerm);

    await expect(page.locator('h2.title.text-center')).toContainText(/searched products/i);
    expect(await productsPage.productCards.count()).toBeGreaterThan(0);
    await expect(productsPage.cardByName(referenceName).first()).toBeVisible();
  });

  test('Test Case 21: Add review on product', async ({ productsPage, productDetailPage }) => {
    await productsPage.goto();
    const firstCard = productsPage.productCards.first();
    await productsPage.viewProductLinkFor(firstCard).click();

    await expect(productDetailPage.writeYourReviewTab).toBeVisible();

    await productDetailPage.submitReview(
      'SDET Reviewer',
      `sdet.review.${Date.now()}@example.com`,
      'Great product, exactly as described.',
    );

    await expect(productDetailPage.reviewSuccessMessage).toBeVisible();
  });
});
