import { test as base, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STUB = fs.readFileSync(path.join(__dirname, 'stub.js'), 'utf8');

/**
 * Aplica el mismo bloqueo de CDNs + stub que usa la fixture `page` a una
 * página creada a mano (p. ej. una segunda pestaña con el reloj falseado).
 * Debe llamarse antes de cualquier `page.goto`.
 */
export async function setupStubbedPage(page: Page) {
  await page.route('**/cdn.jsdelivr.net/**', (r) => r.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('**/cdnjs.cloudflare.com/**', (r) => r.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('**/*supabase.co/**', (r) => r.abort());
  await page.addInitScript(STUB);
}

type Fixtures = {
  consoleErrors: string[];
  dialogMessages: string[];
  gotoApp: () => Promise<void>;
};

/**
 * Cada spec recibe una página con: los CDN externos servidos vacíos, el
 * cliente de Supabase / Chart.js / jsPDF reemplazados por el stub en
 * memoria (tests/e2e/stub.js), captura de errores de consola/página, y
 * los `alert`/`confirm` nativos de la app aceptados solos (su texto
 * queda en `dialogMessages` por si una prueba necesita revisarlo).
 *
 * Este stub valida lógica y UI del frontend; NO es una prueba de RLS —
 * esa sigue siendo responsabilidad exclusiva de supabase/PRUEBA_RLS.sql
 * contra una base real. Son dos capas separadas a propósito, no
 * redundantes.
 */
export const test = base.extend<Fixtures>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await use(errors);
  },
  dialogMessages: async ({ page }, use) => {
    const messages: string[] = [];
    page.on('dialog', async (d) => { messages.push(d.message()); await d.accept(); });
    await use(messages);
  },
  page: async ({ page }, use) => {
    await page.route('**/cdn.jsdelivr.net/**', (r) => r.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.route('**/cdnjs.cloudflare.com/**', (r) => r.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.route('**/*supabase.co/**', (r) => r.abort());
    await page.addInitScript(STUB);
    await use(page);
  },
  gotoApp: async ({ page, consoleErrors, dialogMessages }, use) => {
    // Referenciarlas aquí solo garantiza que sus listeners ya están
    // activos antes de navegar.
    void consoleErrors;
    void dialogMessages;
    await use(async () => {
      await page.goto('/index.html');
      // La app entra de forma asíncrona (onAuthStateChange dispara en un
      // setTimeout(0)); esperamos la señal real de "ya inició sesión" en
      // vez de una espera fija.
      await expect(page.locator('#auth-screen')).toBeHidden();
    });
  },
});

export { expect };
