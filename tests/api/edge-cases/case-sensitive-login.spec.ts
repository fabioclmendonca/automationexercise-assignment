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

// File-local only, same convention as every other API spec: each file owns
// its own unique test data independently rather than sharing a builder.
function buildAccountPayload(email: string): AccountPayload {
  return {
    name: 'SDET Case Sensitivity',
    email,
    password: 'Passw0rd!123',
    title: 'Mr',
    birth_date: '10',
    birth_month: '5',
    birth_year: '1990',
    firstname: 'SDET',
    lastname: 'CaseSensitivity',
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

// This documents a known usability quirk (see docs/exploratory-testing.md
// F7), not a defect - the finding recommends pinning/documenting current
// behavior rather than treating it as a bug to fix, so this is a normal
// passing test with no test.fail().
test(
  'login is case-sensitive on the registered email address',
  { tag: ['@login', '@edge-case'] },
  async ({ request }) => {
    const email = `sdet.case-sensitivity.${Date.now()}@example.com`;
    const payload = buildAccountPayload(email);

    try {
      const createResponse = await request.post('/api/createAccount', { form: payload });
      const createBody = await createResponse.json();
      expect(createBody.responseCode).toBe(201);

      const exactCaseResponse = await request.post('/api/verifyLogin', {
        form: { email, password: payload.password },
      });
      const exactCaseBody = await exactCaseResponse.json();
      expect(exactCaseBody.responseCode).toBe(200);
      expect(exactCaseBody.message).toBe('User exists!');

      const upperCaseResponse = await request.post('/api/verifyLogin', {
        form: { email: email.toUpperCase(), password: payload.password },
      });
      const upperCaseBody = await upperCaseResponse.json();
      expect(upperCaseBody.responseCode).toBe(404);
      expect(upperCaseBody.message).toBe('User not found!');
    } finally {
      await deleteAccountBestEffort(request, email, payload.password);
    }
  },
);
