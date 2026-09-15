import { test, expect } from '@playwright/test';

// See docs/test-strategy.md ("Verified API quirk"): status is always 200,
// so every assertion below reads body.responseCode.

test.describe('POST /api/searchProduct', { tag: '@search' }, () => {
  test('returns matching products for a known search term', async ({ request }) => {
    const response = await request.post('/api/searchProduct', {
      form: { search_product: 'Top' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(200);
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBeGreaterThan(0);
  });

  test('rejects a request missing the search_product parameter', async ({ request }) => {
    const response = await request.post('/api/searchProduct');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(400);
    expect(body.message).toBe(
      'Bad request, search_product parameter is missing in POST request.',
    );
  });
});
