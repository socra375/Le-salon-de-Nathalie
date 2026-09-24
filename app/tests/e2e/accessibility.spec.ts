import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Auditoría automática de accesibilidad (Fase 6 del plan) contra el build
// real, en un navegador real -- a diferencia de los chequeos con axe-core
// en Vitest/jsdom (uno por componente, en tests/unit/), acá sí se evalúan
// las reglas que dependen de layout/contraste real. Sin un stub de
// Supabase en este suite (a diferencia del legado en la raíz), la única
// pantalla alcanzable hoy sin credenciales reales es la de "falta
// configuración"; el resto de las pantallas ya tienen su propio chequeo
// de axe-core a nivel de componente en tests/unit/.
test.describe('Accesibilidad (axe-core)', () => {
  test('la pantalla de configuración faltante no tiene violaciones', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
