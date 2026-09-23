/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// GitHub Pages de proyecto sirve desde /<nombre-del-repo>/, no desde la raíz
// del dominio. El repo se llama hoy "gestor-empresarial" (renombrado desde
// "Le-salon-de-Nathalie"; no hay CNAME de dominio propio en el repo) — la
// URL real confirmada es https://socra375.github.io/gestor-empresarial/.
// Un `base` mal puesto aquí es exactamente el tipo de error que rompe todos
// los assets en silencio recién hecho el corte de la Fase 7; por eso la
// prueba de tests/e2e/base-path.spec.ts existe desde esta misma fase.
const BASE = '/gestor-empresarial/';

export default defineConfig({
  base: BASE,
  plugins: [svelte()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    passWithNoTests: false,
  },
});
