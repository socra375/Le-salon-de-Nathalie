import { test, expect } from './fixtures';

// Cubre los 3 idiomas nuevos agregados en la Fase 4 (portugués, alemán,
// italiano) además de los 3 que ya existían, confirmando que el selector
// de Configuración > Idioma los ofrece todos y que aplican de verdad sin
// errores de JavaScript.

const EXPECTED_TODAY_LABEL: Record<string, string> = {
  es: 'Hoy',
  en: 'Today',
  fr: "Aujourd'hui",
  pt: 'Hoje',
  de: 'Heute',
  it: 'Oggi',
};

test.describe('Selector de idioma', () => {
  test('el selector ofrece los 6 idiomas soportados', async ({ page, gotoApp }) => {
    await gotoApp();
    await page.click('#btn-header-settings');
    await page.click('.settings-row[data-tab="tab-cfg-language"]');

    const values = await page.locator('#cfg-language option').evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value)
    );
    expect(values.sort()).toEqual(['de', 'en', 'es', 'fr', 'it', 'pt']);
  });

  for (const [lang, label] of Object.entries(EXPECTED_TODAY_LABEL)) {
    test(`cambiar a "${lang}" traduce la interfaz`, async ({ page, gotoApp }) => {
      await gotoApp();
      await page.click('#btn-header-settings');
      await page.click('.settings-row[data-tab="tab-cfg-language"]');

      await page.selectOption('#cfg-language', lang);
      await page.locator('#form-cfg-language button[type="submit"]').click();

      await expect(page.locator('[data-period="today"]')).toHaveText(label);
      expect(await page.evaluate(() => document.documentElement.lang)).toBe(lang);
    });
  }
});
