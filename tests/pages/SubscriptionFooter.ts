import type { Page, Locator } from '@playwright/test';

/**
 * The footer subscription widget. Confirmed live (via curl) that the home
 * page and cart page render identical markup/ids for this widget, so one
 * small component is held as a property on both `HomePage` and `CartPage`
 * rather than duplicating three locators in each. No assertions here - keep
 * those in the spec files.
 */
export class SubscriptionFooter {
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly subscribeButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Subscription' });
    this.emailInput = page.locator('#susbscribe_email');
    this.subscribeButton = page.locator('#subscribe');
    this.successMessage = page.getByText('You have been successfully subscribed!');
  }

  async subscribe(email: string): Promise<void> {
    await this.emailInput.scrollIntoViewIfNeeded();
    await this.emailInput.fill(email);
    await this.subscribeButton.click();
  }
}
