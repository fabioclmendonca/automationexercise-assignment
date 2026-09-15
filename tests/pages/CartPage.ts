import type { Page, Locator } from '@playwright/test';
import { SubscriptionFooter } from './SubscriptionFooter';

/**
 * Cart page (`/view_cart`) of automationexercise.com, including the
 * "Proceed To Checkout" gating modal it can trigger for a guest user. Only
 * the elements needed by current tests are exposed. No assertions here -
 * keep those in the spec files.
 */
export class CartPage {
  readonly page: Page;
  readonly cartRows: Locator;
  readonly proceedToCheckoutButton: Locator;
  readonly checkoutModal: Locator;
  readonly registerLoginLinkInModal: Locator;
  readonly subscriptionFooter: SubscriptionFooter;

  constructor(page: Page) {
    this.page = page;
    this.cartRows = page.locator('#cart_info_table tbody tr');
    this.proceedToCheckoutButton = page.locator('.check_out');
    this.checkoutModal = page.locator('#checkoutModal');
    this.registerLoginLinkInModal = this.checkoutModal.getByRole('link', {
      name: 'Register / Login',
    });
    this.subscriptionFooter = new SubscriptionFooter(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/view_cart');
  }

  /** The cart row whose visible text contains the given product name. */
  rowByProductName(name: string): Locator {
    return this.cartRows.filter({ hasText: name });
  }

  nameFor(row: Locator): Locator {
    return row.locator('.cart_description h4 a');
  }

  unitPriceFor(row: Locator): Locator {
    return row.locator('.cart_price p');
  }

  quantityFor(row: Locator): Locator {
    return row.locator('.cart_quantity button');
  }

  totalFor(row: Locator): Locator {
    return row.locator('.cart_total .cart_total_price');
  }

  /**
   * Clicks "Proceed To Checkout", which either shows the guest-checkout
   * modal or navigates straight to `/checkout` for a logged-in user.
   * Navigation is awaited first and given the full window on its own
   * (confirmed live on Firefox: the modal's Bootstrap trigger can flash
   * briefly visible before a logged-in redirect completes, so racing the
   * two naively can return too early, before the redirect finishes). Only
   * once navigation doesn't happen do we treat the modal as the outcome,
   * and only then retry the click (this site's handler occasionally isn't
   * attached in time for the very first click, confirmed live).
   */
  async proceedToCheckout(): Promise<void> {
    await this.proceedToCheckoutButton.click();
    const navigated = await this.page
      .waitForURL('**/checkout', { timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (navigated) return;

    try {
      await this.checkoutModal.waitFor({ state: 'visible', timeout: 3_000 });
    } catch {
      await this.proceedToCheckoutButton.click();
      await Promise.race([
        this.checkoutModal.waitFor({ state: 'visible', timeout: 5_000 }),
        this.page.waitForURL('**/checkout', { timeout: 5_000 }),
      ]);
    }
  }

  /** Confirmed live as `.cart_quantity_delete` inside each cart row. */
  removeButtonFor(row: Locator): Locator {
    return row.locator('.cart_quantity_delete');
  }

  /** Removes a cart row, retrying once if the first click's AJAX handler doesn't fire (confirmed live, intermittent). */
  async removeProduct(row: Locator): Promise<void> {
    await this.removeButtonFor(row).click();
    try {
      await row.waitFor({ state: 'hidden', timeout: 5_000 });
    } catch {
      await this.removeButtonFor(row).click();
      await row.waitFor({ state: 'hidden' });
    }
  }

  /** Navigates to `/login` from the guest-checkout modal, retrying once if the first click doesn't navigate (confirmed live, intermittent). */
  async clickRegisterFromCheckoutModal(): Promise<void> {
    await this.registerLoginLinkInModal.click();
    try {
      await this.page.waitForURL('**/login', { timeout: 5_000 });
    } catch {
      await this.registerLoginLinkInModal.click();
      await this.page.waitForURL('**/login');
    }
  }
}
