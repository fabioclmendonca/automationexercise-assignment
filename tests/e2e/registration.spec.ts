import { test, expect } from '../../fixtures/fixtures';

test.describe('registration', () => {
  test('Test Case 1: Register User', async ({ signupLoginPage }) => {
    const name = 'SDET Registration';
    const email = `sdet.registration.${Date.now()}@example.com`;
    const password = 'Passw0rd!123';

    try {
      await test.step('signup with name and email', async () => {
        await signupLoginPage.goto();
        await expect(signupLoginPage.newUserSignupHeading).toBeVisible();
        await signupLoginPage.signup(name, email);
      });

      await test.step('complete the account information form', async () => {
        await signupLoginPage.createAccount(password);
        await expect(signupLoginPage.accountCreatedHeading).toBeVisible();
      });

      await test.step('continue shows the logged-in header state', async () => {
        await signupLoginPage.continueButton.click();
        await expect(signupLoginPage.loggedInAsText).toHaveText(`Logged in as ${name}`);
      });
    } finally {
      // Cleanup: delete the account this test just created on the shared
      // public demo site. Best-effort - swallow errors so a failure here
      // never masks an earlier real assertion failure above.
      try {
        await signupLoginPage.deleteAccount();
        await expect(signupLoginPage.accountDeletedHeading).toBeVisible();
      } catch (error) {
        console.warn(`Best-effort account deletion failed for ${email}:`, error);
      }
    }
  });
});
