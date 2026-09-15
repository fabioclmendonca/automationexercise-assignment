import { test, expect } from '../../fixtures/fixtures';

test.describe('login', () => {
  test('Test Case 2: Login User with correct email and password', async ({
    signupLoginPage,
    apiAccount,
  }) => {
    await signupLoginPage.goto();
    await expect(signupLoginPage.loginHeading).toBeVisible();

    await signupLoginPage.login(apiAccount.email, apiAccount.password);
    await expect(signupLoginPage.loggedInAsText).toHaveText(`Logged in as ${apiAccount.name}`);

    await signupLoginPage.deleteAccount();
    await expect(signupLoginPage.accountDeletedHeading).toBeVisible();
  });

  test('Test Case 3: Login User with incorrect email and password', async ({
    signupLoginPage,
  }) => {
    await signupLoginPage.goto();
    await expect(signupLoginPage.loginHeading).toBeVisible();

    // Random, never-registered credentials - a negative case that must not
    // depend on or assert against another tester's real account.
    await signupLoginPage.login(`sdet.nouser.${Date.now()}@example.com`, 'WrongPass!123');

    await expect(signupLoginPage.incorrectLoginError).toBeVisible();
    await expect(signupLoginPage.incorrectLoginError).toHaveText(
      'Your email or password is incorrect!',
    );
  });

  test('Test Case 4: Logout User', async ({ signupLoginPage, apiAccount, page }) => {
    await signupLoginPage.goto();
    await expect(signupLoginPage.loginHeading).toBeVisible();

    await signupLoginPage.login(apiAccount.email, apiAccount.password);
    await expect(signupLoginPage.loggedInAsText).toHaveText(`Logged in as ${apiAccount.name}`);

    await signupLoginPage.logout();

    await expect(page).toHaveURL(/\/login$/);
    await expect(signupLoginPage.loginHeading).toBeVisible();
    // No UI "Delete Account" step in this case's official script - cleanup
    // is left to apiAccount's own API-side teardown.
  });

  test('Test Case 5: Register User with existing email', async ({
    signupLoginPage,
    apiAccount,
  }) => {
    await signupLoginPage.goto();
    await expect(signupLoginPage.newUserSignupHeading).toBeVisible();

    // Colliding with apiAccount's own email, guaranteed to already exist.
    await signupLoginPage.signup('SDET Duplicate Attempt', apiAccount.email);

    await expect(signupLoginPage.duplicateEmailError).toBeVisible();
    await expect(signupLoginPage.duplicateEmailError).toHaveText('Email Address already exist!');
    // This case's official script never reaches a logged-in state and has
    // no Delete Account step - do not fabricate one. Only apiAccount's
    // setup account exists, and it is cleaned up solely via the fixture's
    // own API-side teardown (never through the UI).
  });
});
