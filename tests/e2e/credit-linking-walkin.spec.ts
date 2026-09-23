import { test, expect } from './fixtures';

// El bug reportado: al fiar una cita walk-in que en realidad correspondía a
// un cliente ya registrado, la app solo avisaba con un alert sin dar salida.
// Ahora, al elegir Crédito en una cita sin cliente vinculado, aparece un
// selector para enlazarla a uno ya existente antes de completar.

test.describe('Vincular un cliente registrado al fiar una cita walk-in', () => {
  test('permite elegir un cliente registrado y enlaza la cita antes de facturar a crédito', async ({
    page,
    gotoApp,
    dialogMessages,
  }) => {
    await gotoApp();
    const hoy = new Date().toISOString().slice(0, 10);

    // Cita walk-in (sin cliente registrado)
    await page.click('.nav-item[data-target="sec-appointments"]');
    await page.click('#btn-show-add-appt');
    await page.locator('#appt-services-list input[type="checkbox"]').nth(0).check(); // Corte $500
    await page.fill('#appt-input-date', hoy);
    await page.fill('#appt-input-time', '09:00');
    await page.locator('#appointment-form button[type="submit"]').click();

    expect(await page.evaluate(() => !(window as any).__DB.appointments[0].customer_id)).toBe(true);

    const fila = page.locator('#appointments-table-body tr').filter({ hasText: '09:00' });
    await fila.locator('button', { hasText: 'Confirmar' }).click();
    await page.locator('#appointments-table-body tr').filter({ hasText: '09:00' }).locator('button', { hasText: 'Completar' }).click();

    await expect(page.locator('#pay-credit-customer-picker')).toBeHidden();
    await page.locator('#pay-opt-credito').check();
    await expect(page.locator('#pay-credit-customer-picker')).toBeVisible();

    const opts = await page.locator('#pay-credit-customer-select option').allTextContents();
    expect(opts.some((o) => o.includes('Ana'))).toBe(true);

    // Confirmar sin elegir cliente: sigue bloqueando
    await page.click('#btn-confirm-payment');
    await expect(page.locator('#modal-payment-method')).toBeVisible();
    expect(dialogMessages.some((d) => d.includes('cliente registrado'))).toBe(true);

    // Elegir el cliente registrado y confirmar
    const label = (await page.locator('#pay-credit-customer-select option').nth(1).textContent())!.trim();
    await page.selectOption('#pay-credit-customer-select', { label });
    await page.click('#btn-confirm-payment');

    await expect.poll(() => page.evaluate(() => (window as any).__DB.appointments[0].customer_id)).toBe('cli-1');
    expect(await page.evaluate(() => (window as any).__DB.invoices[0]?.payment_method)).toBe('credito');
    expect(await page.evaluate(() => (window as any).__DB.invoices[0]?.customer_id)).toBe('cli-1');
    expect(await page.evaluate(() => (window as any).__DB.customer_credits[0]?.customer_id)).toBe('cli-1');
    expect(await page.evaluate(() => (window as any).__DB.appointments[0].status)).toBe('completada');
  });

  test('con un cliente ya vinculado, el selector no aparece', async ({ page, gotoApp }) => {
    await gotoApp();
    const hoy = new Date().toISOString().slice(0, 10);

    await page.click('.nav-item[data-target="sec-appointments"]');
    await page.click('#btn-show-add-appt');
    await page.selectOption('#appt-customer', { index: 1 });
    await page.locator('#appt-services-list input[type="checkbox"]').nth(0).check();
    await page.fill('#appt-input-date', hoy);
    await page.fill('#appt-input-time', '13:00');
    await page.locator('#appointment-form button[type="submit"]').click();

    const fila = page.locator('#appointments-table-body tr').filter({ hasText: '13:00' });
    await fila.locator('button', { hasText: 'Confirmar' }).click();
    await page.locator('#appointments-table-body tr').filter({ hasText: '13:00' }).locator('button', { hasText: 'Completar' }).click();
    await page.locator('#pay-opt-credito').check();

    await expect(page.locator('#pay-credit-customer-picker')).toBeHidden();
  });
});
