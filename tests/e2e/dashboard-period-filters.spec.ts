import { test, expect, setupStubbedPage } from './fixtures';

// La clienta reportó: "Esta Semana" está mal calculada (mientras "Este Mes"
// está bien), y a veces el dashboard de "Hoy" muestra la cuenta de ayer.
// Causa raíz: "Esta Semana" usaba una ventana móvil de últimos 7 días en vez
// de semana calendario, y el dashboard nunca se recalculaba solo con el paso
// del reloj.

test.describe('Filtros de periodo del dashboard (semana calendario, no ventana móvil)', () => {
  test('"Esta Semana" cuenta solo el lunes de esta semana, no el de la semana pasada', async ({ page, gotoApp }) => {
    const now = new Date();
    const mondayOffset = (now.getDay() + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset, 10, 0, 0);
    const lastMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7, 10, 0, 0);

    const apptThisMonday = {
      id: 'a-this-monday', business_id: 'biz-1', customer_id: null,
      employee_id: 'biz-1', service_id: 'svc-corte', service_ids: ['svc-corte'],
      start_at: monday.toISOString(), end_at: new Date(monday.getTime() + 30 * 60000).toISOString(),
      status: 'completada', price: 500, notes: null,
    };
    const apptLastMonday = {
      id: 'a-last-monday', business_id: 'biz-1', customer_id: null,
      employee_id: 'biz-1', service_id: 'svc-corte', service_ids: ['svc-corte'],
      start_at: lastMonday.toISOString(), end_at: new Date(lastMonday.getTime() + 30 * 60000).toISOString(),
      status: 'completada', price: 700, notes: null,
    };

    // Sembramos las citas ANTES de que la app arranque, directo en la base
    // simulada (se registra después del stub, así window.__DB ya existe).
    await page.addInitScript(([a1, a2]) => {
      (window as any).__DB.appointments.push(a1, a2);
    }, [apptThisMonday, apptLastMonday]);

    await gotoApp();
    const num = async (id: string) =>
      parseFloat((await page.locator('#' + id).textContent())!.replace(/[^0-9.]/g, ''));

    await page.click('.period-btn[data-period="week"]');
    await expect.poll(() => num('dash-net-profit')).toBe(500);

    await page.click('.period-btn[data-period="month"]');
    // Según si el lunes pasado cae en el mismo mes calendario o no.
    await expect
      .poll(async () => [500, 1200].includes(await num('dash-net-profit')))
      .toBe(true);
  });

  test('no revienta al cruzar la medianoche y refrescar sin recargar la página', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setupStubbedPage(page);
    await page.addInitScript(() => {
      (window as any).__fakeNow = new Date('2026-09-22T23:59:00').getTime();
      const RealDate = Date;
      // @ts-expect-error: sustituye Date globalmente solo dentro de esta página de prueba
      window.Date = class extends RealDate {
        constructor(...args: any[]) {
          if (args.length === 0 && (window as any).__fakeNow !== null) {
            super((window as any).__fakeNow);
          } else {
            // @ts-expect-error: reenvío de argumentos variádicos al constructor real
            super(...args);
          }
        }
        static now() {
          return (window as any).__fakeNow !== null ? (window as any).__fakeNow : RealDate.now();
        }
      };
    });

    await page.goto('/index.html');
    await expect(page.locator('#auth-screen')).toBeHidden();

    await page.evaluate(() => {
      (window as any).__fakeNow += 2 * 60000; // cruza a 00:01 del día siguiente
    });
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

    await expect(page.locator('#dash-appt-count')).not.toHaveText('');
    await context.close();
  });
});
