import { test, expect } from '../../fixtures/fixtures';

function parsePrice(text: string): number {
  // Prices render as "Rs. 500" (or "Rs. -2500" for the F1 defect) - match
  // the signed number rather than stripping non-digits, which would also
  // strip the "." in "Rs." and the "-" of a negative total.
  const match = text.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

test(
  'adding a negative quantity produces a negative line total (regression for exploratory finding F1)',
  { tag: ['@cart', '@edge-case'] },
  async ({ productDetailPage, cartPage }) => {
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
  },
);
