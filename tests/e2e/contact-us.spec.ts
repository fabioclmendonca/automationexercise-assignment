import path from 'node:path';
import { test, expect } from '../fixtures/fixtures';

const uploadFilePath = path.join(__dirname, 'data', 'sample-upload.txt');

test.describe('contact us', () => {
  test('Test Case 6: Contact Us Form', async ({ contactUsPage, homePage, page }) => {
    await contactUsPage.goto();
    await expect(contactUsPage.getInTouchHeading).toBeVisible();

    const name = 'SDET Contact';
    const email = `sdet.contact.${Date.now()}@example.com`;
    await contactUsPage.fillForm(name, email, 'Test subject', 'Test message body');
    await contactUsPage.uploadFile(uploadFilePath);

    // Submitting triggers a native window.confirm() dialog on this site
    // (confirmed live, all three browsers) - handled deterministically by
    // registering the dialog listener immediately before the click.
    await contactUsPage.submitAndAcceptDialog();

    await expect(contactUsPage.successMessage).toContainText(
      'Success! Your details have been submitted successfully.',
    );

    await contactUsPage.homeButton.click();
    // A longer timeout here: the live site's ad network occasionally
    // intercepts this outbound click with an interstitial ("Google
    // Vignette") that delays the real navigation by a few seconds.
    await expect(page).toHaveURL(/automationexercise\.com\/?$/, { timeout: 15_000 });
    await expect(homePage.featuresItemsHeading).toBeVisible();
  });
});
