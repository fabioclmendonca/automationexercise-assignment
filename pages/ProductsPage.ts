import type { Page, Locator } from '@playwright/test';
import { CartConfirmationModal } from './CartConfirmationModal';

/**
 * Products listing/search page (`/products`) of automationexercise.com.
 * Its category/brand sidebar is also rendered on the home page and on
 * category/brand pages with identical markup (confirmed live), so tests
 * that start elsewhere (e.g. case 18's home-page category navigation) may
 * still use these locators. Only the elements needed by current tests are
 * exposed. No assertions here - keep those in the spec files.
 */
export class ProductsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly productCards: Locator;
  readonly cartConfirmationModal: CartConfirmationModal;
  readonly womenToggle: Locator;
  readonly menToggle: Locator;
  readonly kidsToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('#search_product');
    this.searchButton = page.locator('#submit_search');
    this.productCards = page.locator('.product-image-wrapper');
    this.cartConfirmationModal = new CartConfirmationModal(page);

    // href-based CSS: each toggle's accessible name also includes its
    // font-icon badge (a CSS-generated glyph, confirmed live), so an exact
    // role-name match never matches, and non-exact substring matching is
    // unsafe here too ("Women" itself contains the substring "men"). The
    // href is unambiguous and there is no label/placeholder alternative.
    const accordion = page.locator('#accordian');
    this.womenToggle = accordion.locator('a[href="#Women"]');
    this.menToggle = accordion.locator('a[href="#Men"]');
    this.kidsToggle = accordion.locator('a[href="#Kids"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/products');
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchButton.click();
  }

  /** A product card whose visible text contains the given name. */
  cardByName(name: string): Locator {
    return this.productCards.filter({ hasText: name });
  }

  nameFor(card: Locator): Locator {
    return card.locator('.productinfo p');
  }

  priceFor(card: Locator): Locator {
    return card.locator('.productinfo h2');
  }

  viewProductLinkFor(card: Locator): Locator {
    return card.getByRole('link', { name: 'View Product' });
  }

  /** A subcategory link (e.g. "Dress") scoped under the given open accordion panel. */
  subcategoryLink(panel: 'Women' | 'Men' | 'Kids', name: string): Locator {
    return this.page.locator(`#${panel}`).getByRole('link', { name });
  }

  /**
   * Clicks a category toggle and waits for its accordion panel to expand.
   * Deliberately does NOT retry the click on a slow first attempt: this
   * toggles a Bootstrap collapse panel, so a second click would close it
   * again rather than "retry" opening it.
   */
  async expandCategory(toggle: Locator, panel: 'Women' | 'Men' | 'Kids'): Promise<void> {
    const panelLocator = this.page.locator(`#${panel}`);
    if (await panelLocator.isVisible()) {
      return;
    }
    await toggle.click();
    await panelLocator.waitFor({ state: 'visible' });
  }

  /**
   * Clicks a subcategory link and confirms it navigated, falling back to a
   * direct navigation via the link's own `href` if the click doesn't
   * navigate promptly. The accordion's collapse animation on this live
   * site can occasionally leave the link mid-transition well past its own
   * transition duration (confirmed live, Firefox) - the fallback keeps the
   * case's real intent (end up on the right category page) deterministic
   * without depending on that animation's exact timing.
   */
  async clickSubcategory(link: Locator): Promise<void> {
    const href = await link.getAttribute('href');
    await link.click({ force: true });
    try {
      await this.page.waitForURL('**/category_products/**', { timeout: 5_000 });
    } catch {
      if (href) await this.page.goto(href);
    }
  }

  /**
   * A sidebar brand link. Non-exact role matching handles the markup quirk
   * where each link's accessible name also includes a leading product-count
   * badge (e.g. "(6)Polo"), confirmed live.
   */
  brandLink(name: string): Locator {
    return this.page.locator('.brands-name').getByRole('link', { name });
  }

  /**
   * Hovers the card to reveal its overlay "Add to cart" link, then clicks
   * it. `.add-to-cart` anchors have no `href`, so they carry no accessible
   * link role (confirmed live) - CSS is used here deliberately, there is
   * no role/label alternative. Retries the click once if the site's AJAX
   * handler doesn't fire in time (confirmed live, intermittent).
   */
  async addToCartFromListing(card: Locator): Promise<void> {
    await card.hover();
    const addToCartLink = card.locator('a.add-to-cart').first();
    await addToCartLink.click();
    try {
      await this.cartConfirmationModal.modal.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      await addToCartLink.click();
      await this.cartConfirmationModal.modal.waitFor({ state: 'visible' });
    }
  }
}
