import type { Page, Locator } from '@playwright/test';

/**
 * Home page of automationexercise.com. Only the elements needed by current
 * tests are exposed. No assertions here - keep those in the spec files.
 */
export class HomePage {
  readonly page: Page;
  readonly featuresItemsHeading: Locator;
  readonly productsNavLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.featuresItemsHeading = page.getByRole('heading', { name: 'Features Items' });
    this.productsNavLink = page.getByRole('link', { name: 'Products' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }
}
