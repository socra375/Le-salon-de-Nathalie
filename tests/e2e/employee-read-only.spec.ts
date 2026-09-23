import { test, expect } from './fixtures';

// Complementa supabase/PRUEBA_RLS.sql (que prueba el permiso real contra la
// base de datos): esta prueba confirma la UI que ve un empleado. Hoy la app
// oculta toda la navegación operativa para el rol employee y solo deja un
// dashboard de solo lectura, sin barra de navegación.

test.describe('Interfaz de solo lectura para el rol de empleado', () => {
  test('un empleado ve el dashboard sin barra de navegación ni acciones de administrador', async ({ page, gotoApp }) => {
    // Se registra DESPUÉS del stub (la fixture ya lo inyectó al crear la
    // página), así que window.__SESSION y window.__DB ya existen: se
    // sustituye el usuario de la sesión y se le afilia como empleado.
    await page.addInitScript(() => {
      (window as any).__SESSION.user = { id: 'emp-1', email: 'empleada@salon.test' };
      (window as any).__DB.business_members.push({
        id: 'bm-employee-1',
        business_id: 'biz-1',
        user_id: 'emp-1',
        role: 'employee',
        employee_name: 'Empleada de Prueba',
      });
    });
    await gotoApp();

    await expect(page.locator('#user-role-badge')).not.toHaveText('');
    await expect(page.locator('#app-nav')).toBeHidden();
    const adminOnlyVisible = await page.locator('.nav-admin-only:visible').count();
    expect(adminOnlyVisible).toBe(0);
    await expect(page.locator('#sec-dashboard')).toBeVisible();
  });

  test('un admin (sin fila en business_members) sigue viendo la navegación operativa', async ({ page, gotoApp }) => {
    await gotoApp();

    await expect(page.locator('#app-nav')).toBeVisible();
    for (const target of ['sec-dashboard', 'sec-appointments', 'sec-reports']) {
      await expect(page.locator(`.nav-item[data-target="${target}"]`)).toBeVisible();
    }
    await expect(page.locator('#btn-header-settings')).toBeVisible();
  });
});
