import { test, expect } from './fixtures';

test.describe('Tono claro/oscuro, eliminar servicios y personalización', () => {
  test('el botón del header cambia y guarda el tono, y vuelve a oscuro', async ({ page, gotoApp }) => {
    await gotoApp();

    await page.click('#btn-theme-toggle');
    await expect(page.locator('body')).toHaveClass(/theme-light/);
    expect(await page.evaluate(() => (window as any).__DB.businesses[0].theme)).toBe('light');

    await page.click('#btn-theme-toggle');
    await expect(page.locator('body')).not.toHaveClass(/theme-light/);
  });

  test('cada servicio tiene botón Eliminar, pide confirmación y lo borra', async ({ page, gotoApp, dialogMessages }) => {
    await gotoApp();

    await page.click('#btn-header-settings');
    await page.click('.settings-row[data-tab="tab-cfg-services"]');

    const delBtns = page.locator('.btn-delete-service');
    await expect(delBtns).toHaveCount(3);

    await delBtns.first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__DB.services.length)).toBe(2);
    expect(dialogMessages.some((d) => d.includes('Corte'))).toBe(true);
  });

  test('Personalización: quitar el fondo lo restablece a sólido', async ({ page, gotoApp }) => {
    await gotoApp();

    await page.click('#btn-header-settings');
    await page.click('.settings-row[data-tab="tab-cfg-appearance"]');
    await expect(page.locator('#tab-cfg-appearance')).toBeVisible();

    await page.evaluate(() => {
      (window as any).__DB.businesses[0].background_url = 'https://example.test/bg.png';
    });
    await page.click('#btn-clear-background');

    await expect
      .poll(() => page.evaluate(() => (window as any).__DB.businesses[0].background_url))
      .toBeNull();
    expect(await page.evaluate(() => document.body.style.backgroundImage)).toBe('');
  });
});
