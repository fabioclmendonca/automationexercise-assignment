import type { Page, Locator } from '@playwright/test';

/**
 * Product detail page (`/product_details/{id}`) of automationexercise.com,
 * including the "added to cart" confirmation modal it triggers. Only the
 * elements needed by current tests are exposed. No assertions here - keep
 * those in the spec files.
 */
export class ProductDetailPage {
  readonly page: Page;
  readonly productName: Locator;
  readonly productPrice: Locator;
  readonly quantityInput: Locator;
  readonly addToCartButton: Locator;
  readonly cartModal: Locator;
  readonly viewCartLink: Locator;
  readonly categoryText: Locator;
  readonly availabilityText: Locator;
  readonly conditionText: Locator;
  readonly brandText: Locator;
  readonly writeYourReviewTab: Locator;
  readonly reviewNameInput: Locator;
  readonly reviewEmailInput: Locator;
  readonly reviewTextArea: Locator;
  readonly reviewSubmitButton: Locator;
  readonly reviewSuccessMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productName = page.locator('.product-information h2');
    this.productPrice = page.locator('.product-information span span').first();
    this.quantityInput = page.locator('#quantity');
    this.addToCartButton = page.getByRole('button', { name: 'Add to cart' });
    // Models the same #cartModal component as the newer
    // pages/CartConfirmationModal.ts - kept inline here deliberately
    // (Phase 1 code, already passing, is not migrated/redesigned). A future
    // edit to one should check the other.
    this.cartModal = page.locator('#cartModal');
    this.viewCartLink = this.cartModal.getByRole('link', { name: 'View Cart' });

    const infoParagraphs = page.locator('.product-information p');
    this.categoryText = infoParagraphs.nth(0);
    this.availabilityText = infoParagraphs.nth(1);
    this.conditionText = infoParagraphs.nth(2);
    this.brandText = infoParagraphs.nth(3);

    this.writeYourReviewTab = page.getByRole('link', { name: 'Write Your Review' });
    this.reviewNameInput = page.locator('#review-form #name');
    this.reviewEmailInput = page.locator('#review-form #email');
    this.reviewTextArea = page.locator('#review-form #review');
    this.reviewSubmitButton = page.locator('#button-review');
    this.reviewSuccessMessage = page.getByText('Thank you for your review.');
  }

  async goto(productId: number): Promise<void> {
    await this.page.goto(`/product_details/${productId}`);
  }

  async setQuantity(quantity: number): Promise<void> {
    await this.quantityInput.fill(String(quantity));
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
    try {
      await this.cartModal.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      // Confirmed live: this site's click handler occasionally isn't
      // attached in time for the very first click - one retry resolves it.
      await this.addToCartButton.click();
      await this.cartModal.waitFor({ state: 'visible' });
    }
  }

  async goToCartFromModal(): Promise<void> {
    await this.viewCartLink.click();
  }

  async submitReview(name: string, email: string, review: string): Promise<void> {
    await this.reviewNameInput.fill(name);
    await this.reviewEmailInput.fill(email);
    await this.reviewTextArea.fill(review);
    await this.reviewSubmitButton.click();
  }
}
