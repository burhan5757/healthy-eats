import { expect, test, type Page } from '@playwright/test'

/**
 * The order lifecycle across all three screens — the behaviour the whole product
 * exists to deliver. If this passes, the system works.
 */

const ADMIN = { email: 'admin@healthyeats.in', password: 'admin123' }
const CHEF = { email: 'chef@healthyeats.in', password: 'chef123' }

async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto('/login')
  await page.fill('#email', who.email)
  await page.fill('#password', who.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/(admin|kitchen)/)
}

/** Adds `count` distinct dishes and checks out as a guest. Returns the order number. */
async function placeGuestOrder(page: Page, count = 2, notes = 'No peanut - allergy') {
  await page.goto('/menu')
  await expect(page.getByRole('heading', { name: /Everything on the pass/ })).toBeVisible()

  for (let i = 0; i < count; i++) {
    // The first "Add" shifts to a stepper each time, so nth(0) walks the list.
    await page.getByRole('button', { name: 'Add', exact: true }).first().click()
  }

  await page.getByRole('link', { name: 'Checkout' }).click()
  await expect(page.getByRole('heading', { name: /Where should the rider come/ })).toBeVisible()

  await page.fill('#name', 'Rohit Kulkarni')
  await page.fill('#phone', '9860422190')
  await page.fill('#line1', 'Flat 12, Sunrise Heights, Baner Road')
  await page.fill('#landmark', 'Next to the gym')
  if (notes) await page.fill('#notes', notes)

  await page.getByRole('button', { name: 'Place Order' }).click()
  await page.waitForURL(/\/track\/HE-\d+/)

  return page.url().split('/').pop()!
}

test.describe('guest checkout', () => {
  test('a customer can order without an account and gets a tracking number', async ({ page }) => {
    const orderNumber = await placeGuestOrder(page)

    expect(orderNumber).toMatch(/^HE-\d{4}$/)
    await expect(page.getByText(orderNumber)).toBeVisible()
    await expect(page.getByText(/keep this number/i)).toBeVisible()
    await expect(page.getByText('Cash to pay on delivery')).toBeVisible()
  })

  test('checkout refuses an incomplete address', async ({ page }) => {
    await page.goto('/menu')
    await page.getByRole('button', { name: 'Add', exact: true }).first().click()
    await page.getByRole('link', { name: 'Checkout' }).click()

    await page.getByRole('button', { name: 'Place Order' }).click()

    await expect(page.getByText('Name is required')).toBeVisible()
    await expect(page.getByText(/valid 10-digit Indian mobile/)).toBeVisible()
    await expect(page).toHaveURL(/\/checkout/) // did not proceed
  })

  test('the cart survives a page reload', async ({ page }) => {
    await page.goto('/menu')
    await page.getByRole('button', { name: 'Add', exact: true }).first().click()
    await expect(page.getByRole('link', { name: 'Checkout' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('link', { name: 'Checkout' })).toBeVisible()
  })

  // Regression: the landing-page cards rendered their buttons with no click
  // handler at all, so Add and Add to order were dead everywhere except /menu.
  test('the landing page cards add to the cart', async ({ page }) => {
    await page.goto('/')

    // Bestsellers rail
    await page.getByRole('button', { name: 'Add', exact: true }).first().click()
    await expect(page.getByText('1 item')).toBeVisible()

    // Today's specials
    await page.getByRole('button', { name: 'Add to order' }).first().click()
    await expect(page.getByText('2 items')).toBeVisible()

    // The card swaps to a stepper, and it drives the same cart
    await page.getByRole('button', { name: /One more/ }).first().click()
    await expect(page.getByText('3 items')).toBeVisible()

    await page.getByRole('link', { name: 'Checkout' }).click()
    await expect(page.getByRole('heading', { name: /Where should the rider come/ })).toBeVisible()
  })

  /**
   * The pin used to default to the kitchen's own coordinates on mount, so an
   * untouched map still sent the rider a pin pointing at the restaurant.
   * Geocoding is deliberately not asserted here — it is a third-party lookup.
   */
  test('the delivery pin starts empty and lands where the customer taps', async ({ page }) => {
    await page.goto('/menu')
    await page.getByRole('button', { name: 'Add', exact: true }).first().click()
    await page.getByRole('link', { name: 'Checkout' }).click()

    await expect(page.getByText(/No pin yet/)).toBeVisible()

    const map = page.locator('.leaflet-container')
    await map.click({ position: { x: 260, y: 150 } })

    await expect(page.getByText(/No pin yet/)).toBeHidden()
    await expect(page.getByText(/km from the kitchen/)).toBeVisible()
  })

  test('searching for an address does not submit the checkout form', async ({ page }) => {
    await page.goto('/menu')
    await page.getByRole('button', { name: 'Add', exact: true }).first().click()
    await page.getByRole('link', { name: 'Checkout' }).click()

    await page.fill('#pin-search', 'Baner')
    await page.press('#pin-search', 'Enter')

    await expect(page).toHaveURL(/\/checkout/)
    // A stray submit would have surfaced the address validation errors.
    await expect(page.getByText('Name is required')).toBeHidden()
  })

  test('tracking an unknown order number fails gracefully', async ({ page }) => {
    await page.goto('/track/HE-0000')
    await expect(page.getByRole('heading', { name: /can't find that order/i })).toBeVisible()
  })
})

test.describe('the three-screen loop', () => {
  test('an order flows customer to admin to chef and back', async ({ browser }) => {
    const customer = await browser.newPage()
    const admin = await browser.newPage()
    const chef = await browser.newPage()

    const orderNumber = await placeGuestOrder(customer)

    await signIn(admin, ADMIN)
    await signIn(chef, CHEF)

    // 1. Admin sees the new order awaiting a decision.
    const adminCard = admin.locator('article').filter({ hasText: orderNumber })
    await expect(adminCard).toBeVisible({ timeout: 15_000 })
    await expect(adminCard.getByText('Placed')).toBeVisible()

    // 2. The kitchen can see it, but must not start it yet.
    const chefTicket = chef.locator('article').filter({ hasText: orderNumber.replace('HE-', '') })
    await expect(chefTicket).toBeVisible({ timeout: 15_000 })
    await expect(chefTicket.getByText('Waiting for admin to accept')).toBeVisible()
    await expect(chefTicket.getByRole('button', { name: 'Ready to Go' })).toHaveCount(0)

    // The allergy note reaches the person cooking.
    await expect(chefTicket.getByText('No peanut - allergy')).toBeVisible()

    // 3. Admin accepts — the chef's button appears live, with no reload.
    await adminCard.getByRole('button', { name: 'Accept' }).click()
    await expect(chefTicket.getByRole('button', { name: 'Ready to Go' })).toBeVisible({
      timeout: 15_000,
    })

    // 4. Chef sends it to the pass.
    await chefTicket.getByRole('button', { name: 'Ready to Go' }).click()
    await expect(chefTicket.getByText('waiting for rider')).toBeVisible({ timeout: 15_000 })

    // 5. Admin closes it out.
    const readyCard = admin.locator('article').filter({ hasText: orderNumber })
    await expect(readyCard.getByRole('button', { name: 'Mark delivered' })).toBeVisible({
      timeout: 15_000,
    })
    await readyCard.getByRole('button', { name: 'Mark delivered' }).click()
    await expect(readyCard.getByText('Delivered')).toBeVisible({ timeout: 15_000 })

    // 6. The customer sees the finished journey.
    await customer.reload()
    await expect(customer.getByText('Delivered')).toBeVisible()
  })

  test('cancelling marks the chosen dish sold out and tells the customer why', async ({
    browser,
  }) => {
    const customer = await browser.newPage()
    const admin = await browser.newPage()

    const orderNumber = await placeGuestOrder(customer, 2, '')
    await signIn(admin, ADMIN)

    const card = admin.locator('article').filter({ hasText: orderNumber })
    await expect(card).toBeVisible({ timeout: 15_000 })

    // Capture the dish the admin is about to declare sold out.
    const firstDish = (await card.locator('li').first().innerText()).replace(/^\d+\s*×\s*/, '').trim()

    await card.getByRole('button', { name: 'Cancel' }).click()
    const dialog = admin.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('checkbox').first().check()
    await dialog.getByRole('button', { name: 'Cancel this order' }).click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })

    // The customer is told which dish ran out.
    await customer.reload()
    await expect(customer.getByText(/kitchen couldn't take this order/i)).toBeVisible()
    await expect(customer.getByText(/Sold out:/)).toBeVisible()

    // The public menu now refuses that dish.
    const menu = await browser.newPage()
    await menu.goto('/menu')
    const soldOutCard = menu.locator('article').filter({ hasText: firstDish })
    await expect(soldOutCard.getByText('Unavailable today')).toBeVisible({ timeout: 15_000 })
    await expect(soldOutCard.getByRole('button', { name: 'Sold out' })).toBeDisabled()

    // Put it back so the suite can run again.
    await admin.goto('/admin/menu')
    const row = admin.locator('div').filter({ hasText: firstDish }).getByRole('switch').first()
    await row.click()
  })
})
