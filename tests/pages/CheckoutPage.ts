import type { Page, Locator, Download } from '@playwright/test';

/**
 * Checkout (`/checkout`) and payment (`/payment`) pages of
 * automationexercise.com, modeled together since they are one continuous
 * order-placement flow: Address Details / Review Your Order -> order
 * comment -> Place Order -> dummy payment form -> Pay and Confirm Order ->
 * confirmation, optionally followed by Download Invoice. Payment field
 * values are not under test in any official case that uses this flow (same
 * reasoning already applied in `SignupLoginPage.createAccount()`'s fixed
 * address defaults), so `completeOrder()` fills them with fixed dummy
 * values internally.
 *
 * Per project standards, this class does not assert internally:
 * `completeOrder()` performs actions through to the order-confirmation
 * state and exposes `confirmationMessage` for the calling spec to assert.
 * This matters concretely for case 24, which must assert success *before*
 * calling `downloadInvoice()`.
 */
export class CheckoutPage {
  readonly page: Page;

  readonly addressDetailsHeading: Locator;
  readonly reviewOrderHeading: Locator;
  readonly addressDeliverySection: Locator;
  readonly addressInvoiceSection: Locator;
  readonly commentTextArea: Locator;
  readonly placeOrderButton: Locator;

  readonly nameOnCardInput: Locator;
  readonly cardNumberInput: Locator;
  readonly cvcInput: Locator;
  readonly expiryMonthInput: Locator;
  readonly expiryYearInput: Locator;
  readonly payAndConfirmButton: Locator;

  readonly orderPlacedHeading: Locator;
  readonly confirmationMessage: Locator;
  readonly downloadInvoiceLink: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.addressDetailsHeading = page.getByRole('heading', { name: 'Address Details' });
    this.reviewOrderHeading = page.getByRole('heading', { name: 'Review Your Order' });
    this.addressDeliverySection = page.locator('#address_delivery');
    this.addressInvoiceSection = page.locator('#address_invoice');
    this.commentTextArea = page.locator('textarea[name="message"]');
    this.placeOrderButton = page.getByRole('link', { name: 'Place Order' });

    this.nameOnCardInput = page.locator('[data-qa="name-on-card"]');
    this.cardNumberInput = page.locator('[data-qa="card-number"]');
    this.cvcInput = page.locator('[data-qa="cvc"]');
    this.expiryMonthInput = page.locator('[data-qa="expiry-month"]');
    this.expiryYearInput = page.locator('[data-qa="expiry-year"]');
    this.payAndConfirmButton = page.locator('[data-qa="pay-button"]');

    this.orderPlacedHeading = page.getByRole('heading', { name: 'Order Placed!' });
    // Confirmed live: the official test cases' quoted confirmation text
    // ("Your order has been placed successfully!") does not appear on the
    // real site. The actual rendered text is asserted here instead - see
    // the deviation note in docs/implementation-plan.md / final report.
    this.confirmationMessage = page.getByText('Congratulations! Your order has been confirmed!');
    this.downloadInvoiceLink = page.getByRole('link', { name: 'Download Invoice' });
    this.continueButton = page.locator('[data-qa="continue-button"]');
  }

  /**
   * From the checkout page (Address Details / Review Your Order already
   * visible), enters an order comment, places the order, fills the dummy
   * payment form, and submits it - stopping at the confirmation state
   * without asserting on it (see class docstring).
   */
  async completeOrder(comment: string): Promise<void> {
    await this.commentTextArea.fill(comment);
    await this.placeOrderButton.click();
    await this.page.waitForURL('**/payment');

    await this.nameOnCardInput.fill('SDET Automation');
    await this.cardNumberInput.fill('4111111111111111');
    await this.cvcInput.fill('123');
    await this.expiryMonthInput.fill('12');
    await this.expiryYearInput.fill('2030');
    await this.payAndConfirmButton.click();
    await this.page.waitForURL('**/payment_done/**');
  }

  /** Confirmed live to trigger a real browser `download` event (not a navigation). */
  async downloadInvoice(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.downloadInvoiceLink.click(),
    ]);
    return download;
  }
}
