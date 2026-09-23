import { defineConfig } from '@playwright/test';

// Simula la ruta real de producción bajo GitHub Pages de proyecto:
// https://socra375.github.io/gestor-empresarial/ (repo renombrado desde
// "Le-salon-de-Nathalie"; sin CNAME de dominio propio). vite.config.ts fija
// `base` a ese mismo valor, así que aquí se navega y se verifica bajo el
// mismo prefijo — no contra la raíz "/" de localhost, que escondería un
// `base` mal puesto.
const PORT = 4173;
const BASE_PATH = '/gestor-empresarial/';
const baseURL = `http://127.0.0.1:${PORT}${BASE_PATH}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    // Ver la nota equivalente en el playwright.config.ts de la raíz:
    // por defecto se usa el Chromium que instala `npx playwright install`;
    // esta variable es solo para entornos sandboxed sin esa salida de red.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: {
    // --host 127.0.0.1 explícito: sin esto, `vite preview` resuelve
    // "localhost" según el sistema, que en algunos runners de CI cae en
    // IPv6 — el health-check de Playwright contra 127.0.0.1 nunca conecta
    // y el job entero se cuelga hasta el timeout, sin ningún error claro.
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
});
