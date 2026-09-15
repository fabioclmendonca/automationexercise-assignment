import type { Page, Locator } from '@playwright/test';

/**
 * Contact Us page (`/contact_us`). Confirmed live that clicking Submit
 * triggers a native `window.confirm()` dialog before the success message is
 * rendered - `submitAndAcceptDialog()` registers a one-time dialog handler
 * immediately before the click so the dialog is always accepted
 * deterministically instead of racing it. No assertions here - keep those
 * in the spec files.
 */
export class ContactUsPage {
  readonly page: Page;
  readonly getInTouchHeading: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly subjectInput: Locator;
  readonly messageTextArea: Locator;
  readonly uploadFileInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly homeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getInTouchHeading = page.getByRole('heading', { name: 'Get In Touch' });
    this.nameInput = page.locator('[data-qa="name"]');
    this.emailInput = page.locator('[data-qa="email"]');
    this.subjectInput = page.locator('[data-qa="subject"]');
    this.messageTextArea = page.locator('[data-qa="message"]');
    this.uploadFileInput = page.locator('input[name="upload_file"]');
    this.submitButton = page.locator('[data-qa="submit-button"]');
    this.successMessage = page.locator('.status.alert-success');
    // On submit, the form's own container is replaced with a "Home" link -
    // scoped to #form-section since the page header also has its own
    // (unrelated) "Home" nav link.
    this.homeButton = page.locator('#form-section').getByRole('link', { name: 'Home' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/contact_us');
  }

  async fillForm(name: string, email: string, subject: string, message: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.subjectInput.fill(subject);
    await this.messageTextArea.fill(message);
  }

  async uploadFile(filePath: string): Promise<void> {
    await this.uploadFileInput.setInputFiles(filePath);
  }

  async submitAndAcceptDialog(): Promise<void> {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.submitButton.click();
  }
}
