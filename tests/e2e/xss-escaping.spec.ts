import { test, expect, STUB } from './fixtures';

// Nombres de cliente y de servicio con una carga XSS inocua (marca una
// bandera en window en vez de nada destructivo) para confirmar que la app
// los muestra como texto literal en vez de ejecutarlos.
const POISONED_STUB = STUB
  .replace("name: 'Ana Pérez'", `name: '<img src=x onerror="window.__XSS_CLIENTE=true">Ana'`)
  .replace("name: 'Corte'", `name: '<img src=x onerror="window.__XSS_SERVICIO=true">Corte'`);

test.describe('Escape de HTML en nombres de clientes y servicios', () => {
  test('un nombre con carga XSS se muestra como texto, no se ejecuta', async ({ page, gotoApp }) => {
    // Se inyecta DESPUÉS del stub limpio de la fixture: como stub.js
    // reasigna window.__DB por completo, esta segunda inyección con los
    // nombres envenenados es la que queda vigente al cargar la página.
    await page.addInitScript(POISONED_STUB);
    await gotoApp();

    await page.click('#btn-header-settings');
    await page.click('.settings-row[data-tab="tab-cfg-customers"]');
    await page.click('#btn-header-settings');
    await page.click('.settings-row[data-tab="tab-cfg-services"]');

    const result = await page.evaluate(() => ({
      cliente: !!(window as any).__XSS_CLIENTE,
      servicio: !!(window as any).__XSS_SERVICIO,
      textoCliente: document.querySelector('#customers-table-body td')?.textContent || '',
      textoServicio: document.querySelector('#services-table-body td')?.textContent || '',
    }));

    expect(result.cliente, 'el script del nombre de cliente no debe ejecutarse').toBe(false);
    expect(result.servicio, 'el script del nombre de servicio no debe ejecutarse').toBe(false);
    expect(result.textoCliente).toContain('Ana');
    expect(result.textoServicio).toContain('Corte');
  });
});
