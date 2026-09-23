import { defineConfig } from '@playwright/test';

const PORT = 8099;
// Parametrizable para que, en fases posteriores de la migración, estos
// mismos specs puedan apuntar a `vite preview` sirviendo app/dist en vez
// del index.html legado, sin tocar ni un archivo de prueba.
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    // Este entorno trae Chromium pre-instalado en una ruta fija; se apunta
    // ahí de forma explícita en vez de dejar que Playwright intente
    // descargar el suyo (puede no coincidir con la versión de
    // @playwright/test instalada — no importa, con executablePath no se
    // valida la revisión esperada).
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium',
    },
  },
  // Si E2E_BASE_URL ya apunta a un servidor corriendo (p. ej. `vite preview`
  // en una fase posterior), no se levanta ningún http-server propio.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx --yes http-server -p ${PORT} -s .`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
