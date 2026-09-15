import { test, expect } from '../fixtures/fixtures';

test.describe('checkout gating', () => {
  test('a guest is shown the login/register modal instead of reaching checkout', async ({
    productDetailPage,
    cartPage,
    page,
  }) => {
    await productDetailPage.goto(1);
    await productDetailPage.addToCart();
    await productDetailPage.goToCartFromModal();

    await cartPage.proceedToCheckout();

    await expect(cartPage.checkoutModal).toBeVisible();
    await expect(cartPage.checkoutModal).toContainText(
      'Register / Login account to proceed on checkout.',
    );
    // Confirmed via curl before implementation: the gate is a client-side
    // modal (#checkoutModal), not a redirect - the URL never leaves the
    // cart. See docs/implementation-plan.md ("Verified before planning").
    expect(page.url()).toContain('/view_cart');
  });
});
