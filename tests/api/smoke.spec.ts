import { test, expect } from '@playwright/test';

test.describe('smoke', { tag: '@smoke' }, () => {
  test('GET /api/productsList returns products with a successful business response code', async ({
    request,
  }) => {
    const response = await request.get('/api/productsList');

    // Transport-level check: this API always answers HTTP 200, even for
    // unsupported methods or business errors, so this alone proves nothing.
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Business-level check: the real result lives in the JSON body.
    expect(body.responseCode).toBe(200);
    expect(Array.isArray(body.products)).toBe(true);
  });
});
