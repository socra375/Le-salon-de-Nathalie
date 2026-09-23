import { test, expect } from './fixtures';

// Reproduce el bug reportado por la clienta: el dashboard sumaba una venta a
// crédito como ingreso Y como cuenta por cobrar al mismo tiempo, contando el
// mismo dinero dos veces antes de que el cliente lo hubiera pagado de verdad.

test.describe('Crédito vs. ingresos en el dashboard', () => {
  test('el crédito no suma a ingresos hasta que se cobra, y una venta al contado sí suma completa', async ({
    page,
    gotoApp,
  }) => {
    await gotoApp();

    const num = async (id: string) =>
      parseFloat((await page.locator('#' + id).textContent())!.replace(/[^0-9.]/g, ''));

    const hoy = new Date().toISOString().slice(0, 10);

    // Cita para cliente registrado (el crédito lo exige), completada a crédito
    await page.click('.nav-item[data-target="sec-appointments"]');
    await page.click('#btn-show-add-appt');
    await page.selectOption('#appt-customer', { index: 1 }); // Ana Pérez
    await page.locator('#appt-services-list input[type="checkbox"]').nth(1).check(); // Tinte $1500
    await page.fill('#appt-input-date', hoy);
    await page.fill('#appt-input-time', '11:00');
    await page.locator('#appointment-form button[type="submit"]').click();

    const row = page.locator('#appointments-table-body tr').first();
    await row.locator('button', { hasText: 'Confirmar' }).click();
    await page.locator('#appointments-table-body tr').first().locator('button', { hasText: 'Completar' }).click();
    await page.locator('#pay-opt-credito').check();
    await page.click('#btn-confirm-payment');

    await expect.poll(() => page.evaluate(() => (window as any).__DB.invoices.length)).toBe(1);
    expect(await page.evaluate(() => (window as any).__DB.invoices[0]?.payment_method)).toBe('credito');
    expect(await page.evaluate(() => (window as any).__DB.customer_credits.length)).toBe(1);

    await page.click('.nav-item[data-target="sec-dashboard"]');
    await expect.poll(() => num('dash-net-profit')).toBe(0);
    await expect.poll(() => num('dash-receivables')).toBe(1770); // 1500 + 18% imp.

    // El cliente abona $770 desde Clientes -> Estado de cuenta
    await page.click('#btn-header-settings');
    await page.click('.settings-row[data-tab="tab-cfg-customers"]');
    await page.locator('.btn-account').first().click();
    await page.evaluate(() => {
      (document.getElementById('payment-amount') as HTMLInputElement).value = '770';
    });
    await page.locator('#payment-form').evaluate((f: HTMLFormElement) => f.requestSubmit());
    await page.evaluate(() => (document.getElementById('btn-close-account') as HTMLElement).click());

    await page.click('.nav-item[data-target="sec-dashboard"]');
    await expect.poll(() => num('dash-net-profit')).toBe(770);
    await expect.poll(() => num('dash-receivables')).toBe(1000);

    // Una cita al contado debe sumar completa
    await page.click('.nav-item[data-target="sec-appointments"]');
    await page.click('#btn-show-add-appt');
    await page.locator('#appt-services-list input[type="checkbox"]').nth(0).check(); // Corte $500
    await page.fill('#appt-input-date', hoy);
    await page.fill('#appt-input-time', '15:00');
    await page.locator('#appointment-form button[type="submit"]').click();

    const fila = page.locator('#appointments-table-body tr').filter({ hasText: '15:00' });
    await fila.locator('button', { hasText: 'Confirmar' }).click();
    await page.locator('#appointments-table-body tr').filter({ hasText: '15:00' }).locator('button', { hasText: 'Completar' }).click();
    await page.locator('#pay-opt-efectivo').check();
    await page.click('#btn-confirm-payment');

    await page.click('.nav-item[data-target="sec-dashboard"]');
    await expect.poll(() => num('dash-net-profit')).toBe(1270); // $770 abono + $500 efectivo
  });
});
