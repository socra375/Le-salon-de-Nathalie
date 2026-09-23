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
    // Por defecto, Playwright resuelve su propio Chromium descargado con
    // `npx playwright install` (lo normal en CI y en la máquina de
    // cualquier desarrollador). Algunos entornos de desarrollo sandboxed
    // sin salida de red hacia el CDN de Playwright ya traen un Chromium
    // pre-instalado en una ruta fija; PLAYWRIGHT_CHROMIUM_PATH permite
    // apuntar ahí solo en esos casos, sin tocar el comportamiento normal.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
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
