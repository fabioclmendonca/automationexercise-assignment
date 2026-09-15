import type { Page, Locator } from '@playwright/test';

/**
 * The "added to cart" confirmation modal (`#cartModal`) triggered by any
 * hover-triggered "Add to cart" action on a product listing card (home page
 * or products page) or a homepage "Recommended Items" card - confirmed live
 * to be the same global modal in both cases. `ProductDetailPage` models the
 * same DOM inline (`cartModal`/`viewCartLink`, with a comment pointing
 * here) and is deliberately left untouched, since it was built and passing
 * in Phase 1. No assertions here - keep those in the spec files.
 */
export class CartConfirmationModal {
  readonly modal: Locator;
  readonly viewCartLink: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    this.modal = page.locator('#cartModal');
    this.viewCartLink = this.modal.getByRole('link', { name: 'View Cart' });
    this.continueShoppingButton = this.modal.getByRole('button', { name: 'Continue Shopping' });
  }

  async goToCart(): Promise<void> {
    await this.modal.waitFor({ state: 'visible' });
    await this.viewCartLink.click();
  }

  async continueShopping(): Promise<void> {
    await this.modal.waitFor({ state: 'visible' });
    await this.continueShoppingButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }
}
