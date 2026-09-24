import { describe, expect, it, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const { default: RevenueChart } = await import('../../../../src/lib/components/dashboard/RevenueChart.svelte');

afterEach(() => cleanup());

function dayAt(offsetFromToday: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetFromToday);
  d.setHours(0, 0, 0, 0);
  return d;
}

describe('RevenueChart', () => {
  it('expone los datos en una tabla accesible (oculta visualmente, no del árbol de accesibilidad)', () => {
    const points = [
      { date: dayAt(-1), amount: 100 },
      { date: dayAt(0), amount: 250.5 },
    ];
    const { container } = render(RevenueChart, { props: { points, locale: 'es' } });

    const table = container.querySelector('table');
    expect(table).toBeTruthy();
    expect(table?.textContent).toContain('$100.00');
    expect(table?.textContent).toContain('$250.50');
  });

  it('el gráfico visual (SVG) queda oculto para lectores de pantalla -- la tabla es la alternativa accesible', () => {
    const points = [{ date: dayAt(0), amount: 100 }];
    const { container } = render(RevenueChart, { props: { points, locale: 'es' } });

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    const points = Array.from({ length: 7 }, (_, i) => ({ date: dayAt(i - 6), amount: i * 100 }));
    const { container } = render(RevenueChart, { props: { points, locale: 'es' } });
    await expectNoA11yViolations(container);
  });
});
