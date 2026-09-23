import { test, expect } from './fixtures';

test.describe('Método de pago al completar la cita, factura y PDF', () => {
  test('el modal de pago, la factura y el PDF reflejan los servicios, el impuesto y el método elegido', async ({
    page,
    gotoApp,
    dialogMessages,
  }) => {
    await gotoApp();

    // Cita walk-in con 2 servicios (Corte $500 + Tinte $1500 = $2000)
    await page.click('.nav-item[data-target="sec-appointments"]');
    await page.click('#btn-show-add-appt');
    const boxes = page.locator('#appt-services-list input[type="checkbox"]');
    await boxes.nth(0).check();
    await boxes.nth(1).check();
    await page.fill('#appt-input-date', '2026-09-21');
    await page.fill('#appt-input-time', '10:00');
    await page.locator('#appointment-form button[type="submit"]').click();
    await expect(page.locator('#appointments-table-body tr')).toHaveCount(1);

    const row = page.locator('#appointments-table-body tr').first();
    await row.locator('button', { hasText: 'Confirmar' }).click();
    await page.locator('#appointments-table-body tr').first().locator('button', { hasText: 'Completar' }).click();

    await expect(page.locator('#modal-payment-method')).toBeVisible();
    await expect(page.locator('#pay-method-list input[type="radio"]')).toHaveCount(4);

    const summary = page.locator('#pay-method-summary');
    await expect(summary).toContainText('Corte + Tinte');
    await expect(summary).toContainText('2000.00');

    // Crédito en un walk-in sin elegir cliente: sigue exigiendo uno
    const statusBefore = await page.evaluate(() => (window as any).__DB.appointments[0].status);
    await page.locator('#pay-opt-credito').check();
    await page.click('#btn-confirm-payment');
    await expect(page.locator('#modal-payment-method')).toBeVisible();
    expect(dialogMessages.some((d) => d.includes('cliente registrado'))).toBe(true);
    expect(await page.evaluate(() => (window as any).__DB.appointments[0].status)).toBe(statusBefore);

    // Cancelar no completa ni factura
    await page.click('#btn-cancel-payment');
    expect(await page.evaluate(() => (window as any).__DB.appointments[0].status)).toBe(statusBefore);
    expect(await page.evaluate(() => (window as any).__DB.invoices.length)).toBe(0);

    // Completar con efectivo: genera factura con el método, impuesto y estado correctos
    await page.locator('#appointments-table-body tr').first().locator('button', { hasText: 'Completar' }).click();
    await page.locator('#pay-opt-efectivo').check();
    await page.click('#btn-confirm-payment');

    await expect.poll(() => page.evaluate(() => (window as any).__DB.invoices.length)).toBe(1);
    const inv = await page.evaluate(() => (window as any).__DB.invoices[0]);
    expect(inv.payment_method).toBe('efectivo');
    expect(await page.evaluate(() => (window as any).__DB.appointments[0].status)).toBe('completada');
    expect(Math.round(inv.tax_amount)).toBe(360);
    expect(Math.round(inv.total)).toBe(2360);

    // El PDF trae una línea por servicio y la forma de pago
    const pdf: { text: string }[] = await page.evaluate(() => (window as any).__PDF.at(-1).map((l: any) => ({ text: l.text })));
    const texts = pdf.map((l) => l.text);
    expect(texts.some((t) => t.startsWith('Corte'))).toBe(true);
    expect(texts.some((t) => t.startsWith('Tinte'))).toBe(true);
    expect(texts.some((t) => t.includes('FORMA DE PAGO'))).toBe(true);
    expect(texts.some((t) => t === 'Efectivo')).toBe(true);

    // El historial de facturas muestra la columna Pago
    await expect(page.locator('#invoices-table-body tr').first()).toContainText('Efectivo');
  });
});
