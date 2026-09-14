import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

type Fixtures = {
  homePage: HomePage;
};

// Seeds the fixture pattern now, even with a single Page Object, so upcoming
// tests that need HomePage (or further Page Objects) plug in without rework.
// Remove this indirection if it never grows past one Page Object.
export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
});

export { expect };
