import { test, expect } from '../fixtures/fixtures';

test.describe('checkout', { tag: '@checkout' }, () => {
  test('Test Case 14: Place Order: Register while Checkout', async ({
    productDetailPage,
    cartPage,
    signupLoginPage,
    checkoutPage,
  }) => {
    const name = 'SDET Checkout14';
    const email = `sdet.checkout14.${Date.now()}@example.com`;
    const password = 'Passw0rd!123';

    try {
      await test.step('add a product to the cart', async () => {
        await productDetailPage.goto(1);
        await productDetailPage.addToCart();
        await productDetailPage.goToCartFromModal();
      });

      await test.step('start checkout and choose to register', async () => {
        await cartPage.proceedToCheckout();
        await expect(cartPage.checkoutModal).toBeVisible();
        await cartPage.clickRegisterFromCheckoutModal();
        await expect(signupLoginPage.newUserSignupHeading).toBeVisible();
      });

      await test.step('complete registration from the checkout modal', async () => {
        await signupLoginPage.signup(name, email);
        await signupLoginPage.createAccount(password);
        await expect(signupLoginPage.accountCreatedHeading).toBeVisible();
        await signupLoginPage.continueButton.click();
        await expect(signupLoginPage.loggedInAsText).toHaveText(`Logged in as ${name}`);
      });

      await test.step('return to cart and proceed to checkout', async () => {
        await cartPage.goto();
        await cartPage.proceedToCheckout();
        await expect(checkoutPage.addressDetailsHeading).toBeVisible();
        await expect(checkoutPage.reviewOrderHeading).toBeVisible();
      });

      await test.step('complete the order', async () => {
        await checkoutPage.completeOrder('Please deliver during business hours.');
        await expect(checkoutPage.confirmationMessage).toBeVisible();
      });
    } finally {
      try {
        await signupLoginPage.deleteAccount();
        await expect(signupLoginPage.accountDeletedHeading).toBeVisible();
      } catch (error) {
        console.warn(`Best-effort account deletion failed for ${email}:`, error);
      }
    }
  });

  test('Test Case 15: Place Order: Register before Checkout', async ({
    signupLoginPage,
    productDetailPage,
    cartPage,
    checkoutPage,
  }) => {
    const name = 'SDET Checkout15';
    const email = `sdet.checkout15.${Date.now()}@example.com`;
    const password = 'Passw0rd!123';

    try {
      await test.step('register a new account', async () => {
        await signupLoginPage.goto();
        await signupLoginPage.signup(name, email);
        await signupLoginPage.createAccount(password);
        await expect(signupLoginPage.accountCreatedHeading).toBeVisible();
        await signupLoginPage.continueButton.click();
        await expect(signupLoginPage.loggedInAsText).toHaveText(`Logged in as ${name}`);
      });

      await test.step('add a product to the cart', async () => {
        await productDetailPage.goto(1);
        await productDetailPage.addToCart();
        await productDetailPage.goToCartFromModal();
      });

      await test.step('proceed to checkout', async () => {
        await cartPage.proceedToCheckout();
        await expect(checkoutPage.addressDetailsHeading).toBeVisible();
        await expect(checkoutPage.reviewOrderHeading).toBeVisible();
      });

      await test.step('complete the order', async () => {
        await checkoutPage.completeOrder('Ship it carefully, please.');
        await expect(checkoutPage.confirmationMessage).toBeVisible();
      });
    } finally {
      try {
        await signupLoginPage.deleteAccount();
        await expect(signupLoginPage.accountDeletedHeading).toBeVisible();
      } catch (error) {
        console.warn(`Best-effort account deletion failed for ${email}:`, error);
      }
    }
  });

  test('Test Case 16: Place Order: Login before Checkout', async ({
    signupLoginPage,
    apiAccount,
    productDetailPage,
    cartPage,
    checkoutPage,
  }) => {
    await test.step('log in with an existing account', async () => {
      await signupLoginPage.goto();
      await signupLoginPage.login(apiAccount.email, apiAccount.password);
      await expect(signupLoginPage.loggedInAsText).toHaveText(`Logged in as ${apiAccount.name}`);
    });

    await test.step('add a product to the cart', async () => {
      await productDetailPage.goto(1);
      await productDetailPage.addToCart();
      await productDetailPage.goToCartFromModal();
    });

    await test.step('proceed to checkout', async () => {
      await cartPage.proceedToCheckout();
      await expect(checkoutPage.addressDetailsHeading).toBeVisible();
      await expect(checkoutPage.reviewOrderHeading).toBeVisible();
    });

    await test.step('complete the order', async () => {
      await checkoutPage.completeOrder('Leave at the front door.');
      await expect(checkoutPage.confirmationMessage).toBeVisible();
    });

    // apiAccount's own teardown is a safety net for this call - a second
    // deleteAccount against an already-deleted account fails silently.
    await signupLoginPage.deleteAccount();
    await expect(signupLoginPage.accountDeletedHeading).toBeVisible();
  });

  test('Test Case 23: Verify address details in checkout page', async ({
    signupLoginPage,
    apiAccount,
    productDetailPage,
    cartPage,
    checkoutPage,
  }) => {
    await test.step('log in with an existing account', async () => {
      await signupLoginPage.goto();
      await signupLoginPage.login(apiAccount.email, apiAccount.password);
      await expect(signupLoginPage.loggedInAsText).toHaveText(`Logged in as ${apiAccount.name}`);
    });

    await test.step('add a product to the cart', async () => {
      await productDetailPage.goto(1);
      await productDetailPage.addToCart();
      await productDetailPage.goToCartFromModal();
    });

    await test.step('proceed to checkout', async () => {
      await cartPage.proceedToCheckout();
    });

    await test.step('verify delivery and invoice address sections match the account', async () => {
      for (const section of [checkoutPage.addressDeliverySection, checkoutPage.addressInvoiceSection]) {
        await expect(section).toContainText(apiAccount.firstname);
        await expect(section).toContainText(apiAccount.lastname);
        await expect(section).toContainText(apiAccount.address1);
        await expect(section).toContainText(apiAccount.city);
        await expect(section).toContainText(apiAccount.state);
        await expect(section).toContainText(apiAccount.zipcode);
        await expect(section).toContainText(apiAccount.country);
      }
    });

    await signupLoginPage.deleteAccount();
    await expect(signupLoginPage.accountDeletedHeading).toBeVisible();
  });

  test('Test Case 24: Download Invoice after purchase order', async ({
    productDetailPage,
    cartPage,
    signupLoginPage,
    checkoutPage,
  }) => {
    const name = 'SDET Checkout24';
    const email = `sdet.checkout24.${Date.now()}@example.com`;
    const password = 'Passw0rd!123';

    try {
      await test.step('add a product to the cart', async () => {
        await productDetailPage.goto(1);
        await productDetailPage.addToCart();
        await productDetailPage.goToCartFromModal();
      });

      await test.step('start checkout and choose to register', async () => {
        await cartPage.proceedToCheckout();
        await expect(cartPage.checkoutModal).toBeVisible();
        await cartPage.clickRegisterFromCheckoutModal();
        await expect(signupLoginPage.newUserSignupHeading).toBeVisible();
      });

      await test.step('complete registration from the checkout modal', async () => {
        await signupLoginPage.signup(name, email);
        await signupLoginPage.createAccount(password);
        await expect(signupLoginPage.accountCreatedHeading).toBeVisible();
        await signupLoginPage.continueButton.click();
        await expect(signupLoginPage.loggedInAsText).toHaveText(`Logged in as ${name}`);
      });

      await test.step('return to cart and proceed to checkout', async () => {
        await cartPage.goto();
        await cartPage.proceedToCheckout();
        await expect(checkoutPage.addressDetailsHeading).toBeVisible();
        await expect(checkoutPage.reviewOrderHeading).toBeVisible();
      });

      await test.step('complete the order and download the invoice', async () => {
        await checkoutPage.completeOrder('Text me on delivery.');
        // Asserted here, before downloadInvoice() - completeOrder() does not
        // assert internally so this seam exists (see CheckoutPage docstring).
        await expect(checkoutPage.confirmationMessage).toBeVisible();

        const download = await checkoutPage.downloadInvoice();
        expect(download.suggestedFilename()).toBe('invoice.txt');

        await checkoutPage.continueButton.click();
      });
    } finally {
      try {
        await signupLoginPage.deleteAccount();
        await expect(signupLoginPage.accountDeletedHeading).toBeVisible();
      } catch (error) {
        console.warn(`Best-effort account deletion failed for ${email}:`, error);
      }
    }
  });
});
