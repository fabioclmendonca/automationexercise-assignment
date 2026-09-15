import { test, expect } from '@playwright/test';

// Negative/failure-mode coverage only. A real valid login is already
// exercised in account-lifecycle.spec.ts, so this file avoids duplicating
// that positive path. See docs/test-strategy.md ("Verified API quirk"):
// status is always 200, so every assertion below reads body.responseCode.

test.describe('POST /api/verifyLogin', () => {
  test('rejects a request missing required parameters', async ({ request }) => {
    const response = await request.post('/api/verifyLogin', {
      form: { password: 'irrelevant' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(400);
    expect(body.message).toBe(
      'Bad request, email or password parameter is missing in POST request.',
    );
  });

  test('rejects credentials for a non-existent account', async ({ request }) => {
    // Deliberately invalid/never-registered credentials, not an existence
    // lookup by a guessable string - avoids the F5 shared-data pollution
    // trap documented in docs/exploratory-testing.md.
    const response = await request.post('/api/verifyLogin', {
      form: {
        email: `sdet.no-such-account.${Date.now()}@example.com`,
        password: 'not-the-right-password',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(404);
    expect(body.message).toBe('User not found!');
  });

  test('DELETE is not a supported method', async ({ request }) => {
    const response = await request.delete('/api/verifyLogin');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(405);
    expect(body.message).toBe('This request method is not supported.');
  });
});
