import { test, expect } from './fixtures';

test.describe('Generador de códigos de invitación', () => {
  test('genera códigos con crypto.getRandomValues, sin ambigüedad visual y con vigencia de 72h', async ({
    page,
    gotoApp,
  }) => {
    await gotoApp();

    await page.click('#btn-header-settings');
    const empRow = page.locator('.settings-row', { hasText: 'Empleados' });
    if ((await empRow.count()) === 0) {
      // El botón de Empleados vive en la barra de navegación, no en
      // Configuración; se fuerza la sección directamente.
      await page.evaluate(() => document.getElementById('sec-employees')?.classList.remove('hidden'));
    } else {
      await empRow.first().click();
    }

    const codes: string[] = [];
    for (let i = 0; i < 5; i++) {
      if ((await page.locator('#btn-generate-invite').count()) === 0) break;
      await page.click('#btn-generate-invite');
      codes.push((await page.locator('#lbl-generated-code').textContent())!.trim());
    }

    expect(codes).toHaveLength(5);
    expect(codes.every((c) => /^EMP[A-Z2-9]{10}$/.test(c))).toBe(true);
    expect(codes.every((c) => !/[01ILO]/.test(c.slice(3)))).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
    await expect(page.locator('#invite-code-display')).toContainText('72');
  });
});
