import type { Page, Locator } from '@playwright/test';
import { SubscriptionFooter } from './SubscriptionFooter';
import { CartConfirmationModal } from './CartConfirmationModal';

/**
 * Home page of automationexercise.com. Only the elements needed by current
 * tests are exposed. No assertions here - keep those in the spec files.
 */
export class HomePage {
  readonly page: Page;
  readonly featuresItemsHeading: Locator;
  readonly productsNavLink: Locator;
  readonly subscriptionFooter: SubscriptionFooter;
  readonly cartConfirmationModal: CartConfirmationModal;
  readonly recommendedItemsHeading: Locator;
  readonly recommendedItemCards: Locator;
  readonly scrollUpArrow: Locator;
  readonly heroHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.featuresItemsHeading = page.getByRole('heading', { name: 'Features Items' });
    this.productsNavLink = page.getByRole('link', { name: 'Products' });
    this.subscriptionFooter = new SubscriptionFooter(page);
    this.cartConfirmationModal = new CartConfirmationModal(page);
    this.recommendedItemsHeading = page.getByRole('heading', { name: 'Recommended Items' });
    this.recommendedItemCards = page.locator('.recommended_items .product-image-wrapper');
    this.scrollUpArrow = page.locator('#scrollUp');
    // .first(): the hero carousel occasionally renders a duplicate/cloned
    // slide with identical caption text (confirmed live) for seamless
    // looping - either instance being in view proves the same thing.
    this.heroHeading = page
      .getByRole('heading', {
        name: 'Full-Fledged practice website for Automation Engineers',
      })
      .first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * `.add-to-cart` on a recommended-item card is an anchor with no `href`,
   * so it carries no accessible link role (confirmed live) - CSS is used
   * here deliberately, there is no role/label alternative. Retries the
   * click once if the site's AJAX handler doesn't fire in time (confirmed
   * live, intermittent).
   */
  async addToCartFromRecommended(card: Locator): Promise<void> {
    const addToCartLink = card.locator('a.add-to-cart');
    await addToCartLink.click();
    try {
      await this.cartConfirmationModal.modal.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      await addToCartLink.click();
      await this.cartConfirmationModal.modal.waitFor({ state: 'visible' });
    }
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  /** Scrolls to top without using the `#scrollUp` arrow button (case 26). */
  async scrollToTopWithoutButton(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }
}
