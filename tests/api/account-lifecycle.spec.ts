import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

interface AccountPayload {
  [key: string]: string;
  name: string;
  email: string;
  password: string;
  title: string;
  birth_date: string;
  birth_month: string;
  birth_year: string;
  firstname: string;
  lastname: string;
  company: string;
  address1: string;
  address2: string;
  country: string;
  zipcode: string;
  state: string;
  city: string;
  mobile_number: string;
}

// File-local only - deliberately not shared with the E2E registration test.
// Each layer generates its own unique email independently to keep API/E2E
// separation clear (see docs/implementation-plan.md).
function buildAccountPayload(email: string): AccountPayload {
  return {
    name: 'SDET Lifecycle',
    email,
    password: 'Passw0rd!123',
    title: 'Mr',
    birth_date: '10',
    birth_month: '5',
    birth_year: '1990',
    firstname: 'SDET',
    lastname: 'Lifecycle',
    company: 'QA',
    address1: '123 Test Street',
    address2: '',
    country: 'Canada',
    zipcode: '12345',
    state: 'Ontario',
    city: 'Toronto',
    mobile_number: '5551234567',
  };
}

/**
 * Best-effort cleanup only, used from `finally`. A failure here must never
 * throw/assert - that would mask a real assertion failure from an earlier
 * step in `try`. The happy path already deletes and asserts on it as the
 * last step inside `try`; this is a defensive fallback for when an earlier
 * step failed before reaching that point.
 */
async function deleteAccountBestEffort(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<void> {
  try {
    await request.delete('/api/deleteAccount', { form: { email, password } });
  } catch (error) {
    console.warn(`Best-effort deleteAccount cleanup failed for ${email}:`, error);
  }
}

test.describe('account lifecycle (API)', { tag: '@account' }, () => {
  test('create, verify, update, and delete an account end to end', async ({ request }) => {
    const email = `sdet.lifecycle.${Date.now()}@example.com`;
    const payload = buildAccountPayload(email);

    try {
      await test.step('createAccount', async () => {
        const response = await request.post('/api/createAccount', { form: payload });
        const body = await response.json();
        expect(body.responseCode).toBe(201);
      });

      await test.step('getUserDetailByEmail reflects the created account', async () => {
        const response = await request.get('/api/getUserDetailByEmail', {
          params: { email },
        });
        const body = await response.json();
        expect(body.responseCode).toBe(200);
        expect(body.user.name).toBe(payload.name);
        expect(body.user.email).toBe(email);
      });

      await test.step('verifyLogin succeeds with the created credentials', async () => {
        const response = await request.post('/api/verifyLogin', {
          form: { email, password: payload.password },
        });
        const body = await response.json();
        expect(body.responseCode).toBe(200);
        expect(body.message).toBe('User exists!');
      });

      await test.step('updateAccount changes the city', async () => {
        const response = await request.put('/api/updateAccount', {
          form: { ...payload, city: 'Ottawa' },
        });
        const body = await response.json();
        expect(body.responseCode).toBe(200);
      });

      await test.step('getUserDetailByEmail reflects the updated city', async () => {
        const response = await request.get('/api/getUserDetailByEmail', {
          params: { email },
        });
        const body = await response.json();
        expect(body.responseCode).toBe(200);
        expect(body.user.city).toBe('Ottawa');
      });

      // Cleanup on the success path - and the assertion that actually
      // proves deletion worked. The finally block below is a best-effort
      // fallback only, not a substitute for this assertion.
      await test.step('deleteAccount removes the account', async () => {
        const response = await request.delete('/api/deleteAccount', {
          form: { email, password: payload.password },
        });
        const body = await response.json();
        expect(body.responseCode).toBe(200);
      });
    } finally {
      await deleteAccountBestEffort(request, email, payload.password);
    }
  });
});
