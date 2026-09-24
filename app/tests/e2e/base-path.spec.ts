import { test, expect } from '@playwright/test';

// GitHub Pages de proyecto no reescribe rutas del lado del servidor: si el
// `base` de vite.config.ts está mal, los assets compilados dan 404 en
// silencio y la app queda en blanco justo después del corte de producción
// (Fase 7) — el peor momento para descubrirlo. Esta prueba corre en cada
// PR desde esta misma fase, contra el build real bajo el prefijo real.

test.describe('Build bajo el base path real de GitHub Pages', () => {
  test('la página carga con el prefijo /gestor-empresarial/ y sin errores 404', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', (res) => {
      if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
    });

    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Gestión Salón');
    expect(failedRequests).toEqual([]);
  });

  test('recargar la página no deja una pantalla en blanco', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    await page.reload();

    await expect(page.locator('h1')).toBeVisible();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('el favicon resuelve bajo el prefijo del repo, no en la raíz del dominio', async ({ page, baseURL }) => {
    const res = await page.request.get(new URL('favicon-32.png', baseURL).toString());
    expect(res.status()).toBe(200);
  });

  test('el manifest y los íconos de instalación resuelven bajo el prefijo del repo', async ({ page, baseURL }) => {
    const manifestRes = await page.request.get(new URL('manifest.webmanifest', baseURL).toString());
    expect(manifestRes.status()).toBe(200);

    const manifest = await manifestRes.json();
    for (const icon of manifest.icons) {
      const iconRes = await page.request.get(new URL(icon.src, new URL('manifest.webmanifest', baseURL)).toString());
      expect(iconRes.status()).toBe(200);
    }
  });
});
