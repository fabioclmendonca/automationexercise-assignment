import { test, expect } from '../../fixtures/fixtures';

test('non-existent product id gives no not-found indication (regression for exploratory finding F3)', async ({
  productDetailPage,
}) => {
  // test.fail() marks the WHOLE test as expected-to-fail, so this test is
  // kept minimal and tightly scoped to the one known defect.
  // See docs/exploratory-testing.md F3: a non-existent product ID renders
  // a blank-but-200 template instead of a not-found state.
  test.fail();

  await productDetailPage.goto(999999999);

  await expect(productDetailPage.productName).not.toHaveText('');
});
