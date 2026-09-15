import { test, expect } from '@playwright/test';

// This API always answers HTTP 200 at the transport level, even for
// unsupported methods; the real result is in body.responseCode. See
// docs/test-strategy.md ("Verified API quirk") - every assertion below
// reads body.responseCode, never bare response.ok()/status.

test.describe('GET /api/productsList', () => {
  test('returns the product catalog with a successful business response code', async ({
    request,
  }) => {
    const response = await request.get('/api/productsList');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(200);
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBeGreaterThan(0);
  });

  test('POST is not a supported method', async ({ request }) => {
    const response = await request.post('/api/productsList');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(405);
    expect(body.message).toBe('This request method is not supported.');
  });
});

test.describe('GET /api/brandsList', () => {
  test('returns the brand catalog with a successful business response code', async ({
    request,
  }) => {
    const response = await request.get('/api/brandsList');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(200);
    expect(Array.isArray(body.brands)).toBe(true);
    expect(body.brands.length).toBeGreaterThan(0);
  });

  test('PUT is not a supported method', async ({ request }) => {
    const response = await request.put('/api/brandsList');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(405);
    expect(body.message).toBe('This request method is not supported.');
  });
});
