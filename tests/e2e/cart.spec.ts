import { test, expect } from '../../fixtures/fixtures';

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function parsePrice(text: string): number {
  // Prices render as "Rs. 500" (or "Rs. -2500" for the F1 defect) - match
  // the signed number rather than stripping non-digits, which would also
  // strip the "." in "Rs." and the "-" of a negative total.
  const match = text.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

test.describe('cart', () => {
  test('adding a realistic quantity computes the correct cart row and total', async ({
    productDetailPage,
    cartPage,
  }) => {
    await productDetailPage.goto(1);
    const name = normalize(await productDetailPage.productName.innerText());
    const unitPrice = parsePrice(await productDetailPage.productPrice.innerText());

    await productDetailPage.setQuantity(2);
    await productDetailPage.addToCart();
    await productDetailPage.goToCartFromModal();

    const row = cartPage.rowByProductName(name);
    await expect(row).toBeVisible();
    await expect(cartPage.quantityFor(row)).toHaveText('2');
    const total = parsePrice(await cartPage.totalFor(row).innerText());
    expect(total).toBe(unitPrice * 2);
  });

  test('adding a negative quantity produces a negative line total (regression for exploratory finding F1)', async ({
    productDetailPage,
    cartPage,
  }) => {
    // test.fail() marks the WHOLE test as expected-to-fail, so this test is
    // kept minimal and tightly scoped to the one known defect.
    // See docs/exploratory-testing.md F1: the cart accepts negative
    // quantities and computes negative line totals.
    test.fail();

    await productDetailPage.goto(2);
    await productDetailPage.setQuantity(-5);
    await productDetailPage.addToCart();
    await productDetailPage.goToCartFromModal();

    const row = cartPage.cartRows.first();
    const total = parsePrice(await cartPage.totalFor(row).innerText());
    expect(total).toBeGreaterThanOrEqual(0);
  });

  test('Test Case 12: Add Products in Cart', async ({ productsPage, cartPage }) => {
    await productsPage.goto();

    const firstCard = productsPage.productCards.nth(0);
    const secondCard = productsPage.productCards.nth(1);
    const firstName = normalize(await productsPage.nameFor(firstCard).innerText());
    const firstPrice = parsePrice(await productsPage.priceFor(firstCard).innerText());
    const secondName = normalize(await productsPage.nameFor(secondCard).innerText());
    const secondPrice = parsePrice(await productsPage.priceFor(secondCard).innerText());

    await productsPage.addToCartFromListing(firstCard);
    await productsPage.cartConfirmationModal.continueShopping();

    await productsPage.addToCartFromListing(secondCard);
    await productsPage.cartConfirmationModal.goToCart();

    const firstRow = cartPage.rowByProductName(firstName);
    const secondRow = cartPage.rowByProductName(secondName);
    await expect(firstRow).toBeVisible();
    await expect(secondRow).toBeVisible();

    await expect(cartPage.quantityFor(firstRow)).toHaveText('1');
    await expect(cartPage.quantityFor(secondRow)).toHaveText('1');

    expect(parsePrice(await cartPage.totalFor(firstRow).innerText())).toBe(firstPrice);
    expect(parsePrice(await cartPage.totalFor(secondRow).innerText())).toBe(secondPrice);
  });

  test('Test Case 13: Verify Product quantity in Cart', async ({
    homePage,
    productsPage,
    productDetailPage,
    cartPage,
    page,
  }) => {
    await homePage.goto();
    const firstCard = productsPage.productCards.first();
    const name = normalize(await productsPage.nameFor(firstCard).innerText());
    await productsPage.viewProductLinkFor(firstCard).click();
    // A dedicated navigation wait, decoupled from expect.timeout: this
    // live site occasionally takes a few seconds longer to respond.
    await page.waitForURL('**/product_details/**');

    await expect(productDetailPage.productName).toHaveText(name);
    await productDetailPage.setQuantity(4);
    await productDetailPage.addToCart();
    await productDetailPage.goToCartFromModal();

    const row = cartPage.rowByProductName(name);
    await expect(row).toBeVisible();
    await expect(cartPage.quantityFor(row)).toHaveText('4');
  });

  test('Test Case 17: Remove Products From Cart', async ({ productDetailPage, cartPage }) => {
    await productDetailPage.goto(1);
    const name = normalize(await productDetailPage.productName.innerText());
    await productDetailPage.addToCart();
    await productDetailPage.goToCartFromModal();

    const row = cartPage.rowByProductName(name);
    await expect(row).toBeVisible();

    await cartPage.removeProduct(row);

    await expect(row).toBeHidden();
  });

  test('Test Case 20: Search Products and Verify Cart After Login', async ({
    productsPage,
    cartPage,
    signupLoginPage,
    apiAccount,
    page,
  }) => {
    await productsPage.goto();
    const referenceCard = productsPage.productCards.first();
    const referenceName = normalize(await productsPage.nameFor(referenceCard).innerText());
    const searchTerm = referenceName.split(' ')[0];

    await productsPage.search(searchTerm);
    await expect(page.locator('h2.title.text-center')).toContainText(/searched products/i);
    await expect(productsPage.productCards.first()).toBeVisible();

    const cardToAdd = productsPage.productCards.first();
    const name = normalize(await productsPage.nameFor(cardToAdd).innerText());
    await productsPage.addToCartFromListing(cardToAdd);
    await productsPage.cartConfirmationModal.goToCart();

    await expect(cartPage.rowByProductName(name)).toBeVisible();

    await signupLoginPage.goto();
    await signupLoginPage.login(apiAccount.email, apiAccount.password);
    await expect(signupLoginPage.loggedInAsText).toHaveText(`Logged in as ${apiAccount.name}`);

    await cartPage.goto();
    await expect(cartPage.rowByProductName(name)).toBeVisible();
  });

  test('Test Case 22: Add to cart from Recommended items', async ({ homePage, cartPage }) => {
    await homePage.goto();
    await homePage.recommendedItemsHeading.scrollIntoViewIfNeeded();
    await expect(homePage.recommendedItemsHeading).toBeVisible();

    const firstRecommended = homePage.recommendedItemCards.first();
    const name = normalize(await firstRecommended.locator('.productinfo p').innerText());

    await homePage.addToCartFromRecommended(firstRecommended);
    await homePage.cartConfirmationModal.goToCart();

    await expect(cartPage.rowByProductName(name)).toBeVisible();
  });
});
