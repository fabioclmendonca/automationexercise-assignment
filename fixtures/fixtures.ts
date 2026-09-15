import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SignupLoginPage } from '../pages/SignupLoginPage';
import { ProductsPage } from '../pages/ProductsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { ContactUsPage } from '../pages/ContactUsPage';

/**
 * Shape of an account provisioned by the `apiAccount` fixture. A subset of
 * the API's full `createAccount` payload - only the fields tests actually
 * reference (login, address-display assertions). Deliberately local to
 * this file, not shared with `tests/api/account-lifecycle.spec.ts`'s own
 * `AccountPayload` - each layer generates its own payload independently
 * (see docs/test-strategy.md).
 */
export type TestAccount = {
  name: string;
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  address1: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
  mobile_number: string;
};

type Fixtures = {
  homePage: HomePage;
  signupLoginPage: SignupLoginPage;
  productsPage: ProductsPage;
  productDetailPage: ProductDetailPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  contactUsPage: ContactUsPage;
  apiAccount: TestAccount;
};

// The live site serves Google AdSense ads, including full-page "vignette"
// interstitials that can intercept an outbound link click mid-navigation
// (confirmed live: clicking a normal nav link intermittently left the URL
// on the original page with a "#google_vignette" hash appended, or blocked
// the click from reaching its target entirely). Blocking the ad-serving
// domains removes this source of test flakiness without touching anything
// under test - automationexercise.com's own behavior is unaffected.
const AD_HOST_PATTERN = /googlesyndication\.com|doubleclick\.net|googletagservices\.com|google\.com\/pagead|adtrafficquality\.google/i;

// Grown past the single-Page-Object seed this comment used to describe:
// every E2E spec now injects the Page Object(s) for the UI surface it
// exercises, rather than constructing them inline.
export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await page.route(
      (url) => AD_HOST_PATTERN.test(url.href),
      (route) => route.abort(),
    );
    await use(page);
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  signupLoginPage: async ({ page }, use) => {
    await use(new SignupLoginPage(page));
  },
  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page));
  },
  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  contactUsPage: async ({ page }, use) => {
    await use(new ContactUsPage(page));
  },
  // Provisions a unique account via the API before the test runs, and
  // best-effort deletes it afterwards. Promoted from a per-case decision to
  // a shared fixture because seven of the 26 official cases need "a unique
  // account exists via the API, with known credentials/address" as setup -
  // real, counted duplication - and a fixture guarantees the teardown
  // actually runs rather than depending on every spec remembering a
  // try/finally. See docs/implementation-plan.md's Phase 2 section.
  apiAccount: async ({ request }, use) => {
    const unique = `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    const account: TestAccount = {
      name: 'SDET Fixture',
      email: `sdet.fixture.${unique}@example.com`,
      password: 'Passw0rd!123',
      firstname: 'SDET',
      lastname: 'Fixture',
      address1: '123 Test Street',
      country: 'Canada',
      state: 'Ontario',
      city: 'Toronto',
      zipcode: '12345',
      mobile_number: '5551234567',
    };

    await request.post('/api/createAccount', {
      form: {
        ...account,
        title: 'Mr',
        birth_date: '10',
        birth_month: '5',
        birth_year: '1990',
        company: 'QA',
        address2: '',
      },
    });

    await use(account);

    try {
      await request.delete('/api/deleteAccount', {
        form: { email: account.email, password: account.password },
      });
    } catch (error) {
      console.warn(`Best-effort account deletion failed for ${account.email}:`, error);
    }
  },
});

export { expect };
