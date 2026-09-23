import { test, expect } from './fixtures';

test.describe('Varios servicios por cita', () => {
  test('el formulario suma duración y precio, y la cita queda guardada con todos los servicios', async ({ page, gotoApp }) => {
    await gotoApp();

    await page.click('.nav-item[data-target="sec-appointments"]');
    await page.click('#btn-show-add-appt');

    const boxes = page.locator('#appt-services-list input[type="checkbox"]');
    await expect(boxes).toHaveCount(3);

    await boxes.nth(0).check(); // Corte  500 / 30min
    await boxes.nth(1).check(); // Tinte 1500 / 90min

    const info = page.locator('#appt-service-info');
    await expect(info).toContainText('120');
    await expect(info).toContainText('2000.00');

    await page.fill('#appt-input-date', '2026-09-21');
    await page.fill('#appt-input-time', '10:00');
    await page.locator('#appointment-form button[type="submit"]').click();

    await expect(page.locator('#appointments-table-body tr')).toContainText('Corte + Tinte');

    const apptWrite = await page.evaluate(() =>
      (window as any).__WRITES.find((w: any) => w.op === 'insert' && w.table === 'appointments')?.rows[0]
    );

    expect(Array.isArray(apptWrite?.service_ids)).toBe(true);
    expect(apptWrite?.service_ids).toHaveLength(2);
    expect(apptWrite?.service_id).toBe(apptWrite?.service_ids?.[0]);
    expect(Number(apptWrite?.price)).toBe(2000);

    const durMin = (new Date(apptWrite.end_at).getTime() - new Date(apptWrite.start_at).getTime()) / 60000;
    expect(durMin).toBe(120);
  });
});
