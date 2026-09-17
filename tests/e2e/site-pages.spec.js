import { expect, test } from './fixtures.js'

/** Public pages added for launch: legal pages and order lookup. */

test('the footer links to the privacy policy and terms', async ({ page }) => {
  await page.goto('/')
  const footer = page.locator('footer')

  await footer.getByRole('link', { name: 'Privacy' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Privacy policy' }),
  ).toBeVisible()

  await page.locator('footer').getByRole('link', { name: 'Terms' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Terms of ordering' }),
  ).toBeVisible()
})

test('an order number typed on the lookup page opens its tracking page', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .locator('footer')
    .getByRole('link', { name: 'Track an order' })
    .click()
  await expect(page).toHaveURL(/\/track$/)

  await page.getByLabel('Order number').fill('he-2222aaaa')
  await page.getByRole('button', { name: 'Track' }).click()
  await expect(page).toHaveURL(/\/track\/HE-2222AAAA$/)
  await expect(page.getByText(/can.t find that order/)).toBeVisible()
})
