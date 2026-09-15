import type { Page, Locator } from '@playwright/test';

/**
 * Models the full signup/login/account-lifecycle UI surface, not just the
 * `/login` page: the login form, the signup form, the multi-field account
 * information form reached after signup, the "Account Created!"/"Account
 * Deleted!" states, and the header's "Logged in as ..." text plus the
 * "Delete Account" link. All of these are one continuous user journey on
 * this site (signup and login share `/login`; account info, creation and
 * deletion all redirect back through the same header), so one Page Object
 * covers them rather than splitting by URL. No assertions here - keep those
 * in the spec files.
 */
export class SignupLoginPage {
  readonly page: Page;

  // Login form
  readonly loginHeading: Locator;
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginButton: Locator;
  readonly incorrectLoginError: Locator;

  // Signup form
  readonly newUserSignupHeading: Locator;
  readonly signupNameInput: Locator;
  readonly signupEmailInput: Locator;
  readonly signupButton: Locator;
  readonly duplicateEmailError: Locator;

  // Account information form (shown after signup)
  readonly titleMrRadio: Locator;
  readonly accountPasswordInput: Locator;
  readonly daySelect: Locator;
  readonly monthSelect: Locator;
  readonly yearSelect: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly addressInput: Locator;
  readonly countrySelect: Locator;
  readonly stateInput: Locator;
  readonly cityInput: Locator;
  readonly zipcodeInput: Locator;
  readonly mobileNumberInput: Locator;
  readonly newsletterCheckbox: Locator;
  readonly specialOffersCheckbox: Locator;
  readonly createAccountButton: Locator;

  // Account created / deleted states
  readonly accountCreatedHeading: Locator;
  readonly accountDeletedHeading: Locator;
  readonly continueButton: Locator;

  // Header (logged-in state)
  readonly loggedInAsText: Locator;
  readonly deleteAccountLink: Locator;
  readonly logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.loginHeading = page.getByRole('heading', { name: 'Login to your account' });
    this.loginEmailInput = page.locator('[data-qa="login-email"]');
    this.loginPasswordInput = page.locator('[data-qa="login-password"]');
    this.loginButton = page.locator('[data-qa="login-button"]');
    // Rendered only after a failed login attempt - scoped to the login
    // form so it can never match the signup form's own error paragraph.
    this.incorrectLoginError = page.locator('.login-form form p');

    this.newUserSignupHeading = page.getByRole('heading', { name: 'New User Signup!' });
    this.signupNameInput = page.locator('[data-qa="signup-name"]');
    this.signupEmailInput = page.locator('[data-qa="signup-email"]');
    this.signupButton = page.locator('[data-qa="signup-button"]');
    // Rendered only after a signup attempt with an already-registered
    // email - scoped to the signup form for the same reason as above.
    this.duplicateEmailError = page.locator('.signup-form form p');

    this.titleMrRadio = page.locator('#id_gender1');
    this.accountPasswordInput = page.locator('[data-qa="password"]');
    this.daySelect = page.locator('#days');
    this.monthSelect = page.locator('#months');
    this.yearSelect = page.locator('#years');
    this.firstNameInput = page.locator('[data-qa="first_name"]');
    this.lastNameInput = page.locator('[data-qa="last_name"]');
    this.addressInput = page.locator('[data-qa="address"]');
    this.countrySelect = page.locator('[data-qa="country"]');
    this.stateInput = page.locator('[data-qa="state"]');
    this.cityInput = page.locator('[data-qa="city"]');
    this.zipcodeInput = page.locator('[data-qa="zipcode"]');
    this.mobileNumberInput = page.locator('[data-qa="mobile_number"]');
    this.newsletterCheckbox = page.getByLabel('Sign up for our newsletter!');
    this.specialOffersCheckbox = page.getByLabel('Receive special offers from our partners!');
    this.createAccountButton = page.locator('[data-qa="create-account"]');

    this.accountCreatedHeading = page.getByRole('heading', { name: 'Account Created!' });
    this.accountDeletedHeading = page.getByRole('heading', { name: 'Account Deleted!' });
    this.continueButton = page.locator('[data-qa="continue-button"]');

    this.loggedInAsText = page.getByText(/Logged in as/);
    this.deleteAccountLink = page.getByRole('link', { name: 'Delete Account' });
    this.logoutLink = page.getByRole('link', { name: 'Logout' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
    await this.loginButton.click();
  }

  async signup(name: string, email: string): Promise<void> {
    await this.signupNameInput.fill(name);
    await this.signupEmailInput.fill(email);
    await this.signupButton.click();
  }

  /**
   * Fills the account-information form with sensible fixed defaults (not
   * under test here) plus the given password, checks both newsletter/offer
   * opt-in boxes (case 1's explicit steps), then submits it.
   */
  async createAccount(password: string): Promise<void> {
    await this.titleMrRadio.check();
    await this.accountPasswordInput.fill(password);
    await this.daySelect.selectOption('10');
    await this.monthSelect.selectOption('5');
    await this.yearSelect.selectOption('1990');
    await this.newsletterCheckbox.check();
    await this.specialOffersCheckbox.check();
    await this.firstNameInput.fill('SDET');
    await this.lastNameInput.fill('Automation');
    await this.addressInput.fill('123 Test Street');
    await this.countrySelect.selectOption('Canada');
    await this.stateInput.fill('Ontario');
    await this.cityInput.fill('Toronto');
    await this.zipcodeInput.fill('12345');
    await this.mobileNumberInput.fill('5551234567');
    await this.createAccountButton.click();
  }

  async deleteAccount(): Promise<void> {
    await this.deleteAccountLink.click();
  }

  async logout(): Promise<void> {
    await this.logoutLink.click();
  }
}
