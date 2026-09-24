import axe from 'axe-core';

/**
 * Corre axe-core contra el HTML ya montado por `render()` de
 * @testing-library/svelte. jsdom no calcula layout real (tamaños,
 * posición, contraste de color efectivo), así que las reglas que
 * dependen de eso quedan deshabilitadas acá -- darían falsos positivos o
 * negativos fuera de un navegador real. El resto (roles, nombres
 * accesibles, asociación label↔control, jerarquía de encabezados, ARIA
 * bien formado) sí es fiable en jsdom y es justamente lo que este chequeo
 * cubre en cada sección, en vez de una auditoría manual al cierre de la
 * Fase 6 del plan.
 */
export async function expectNoA11yViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
    },
  });

  if (results.violations.length > 0) {
    const details = results.violations
      .map((v) => `[${v.impact}] ${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.html).join('\n  ')}`)
      .join('\n\n');
    throw new Error(`Violaciones de accesibilidad (axe-core):\n\n${details}`);
  }
}
