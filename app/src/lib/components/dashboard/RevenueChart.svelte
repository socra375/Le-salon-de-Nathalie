<script lang="ts">
  import { t } from '../../stores/locale';
  import { fmtWeekdayShort } from '../../utils/format';
  import { isSameCalendarDay } from '../../utils/dates';
  import type { DailyRevenuePoint } from '../../utils/dashboard';
  import type { Locale } from '../../i18n';

  interface Props {
    points: DailyRevenuePoint[];
    locale: Locale;
  }

  const { points, locale }: Props = $props();

  const CHART_HEIGHT = 100;
  const BAR_WIDTH = 30;
  const GAP = 16;
  const RADIUS = 4;
  // Espacio reservado arriba para la etiqueta de valor de la barra más alta
  // (que llega hasta el borde del área de dibujo) -- sin esto, esa etiqueta
  // cae en coordenadas negativas y, con overflow:visible, se dibuja fuera
  // del <svg>, superponiéndose al título de la tarjeta.
  const TOP_GUTTER = 18;
  const AXIS_GUTTER = 20;
  const BASELINE_Y = TOP_GUTTER + CHART_HEIGHT;

  const today = new Date();
  const maxAmount = $derived(Math.max(...points.map((p) => p.amount), 1));
  const totalWidth = $derived(Math.max(points.length * BAR_WIDTH + Math.max(points.length - 1, 0) * GAP, BAR_WIDTH));

  function barHeight(amount: number): number {
    return (amount / maxAmount) * CHART_HEIGHT;
  }

  /** Rectángulo con las esquinas de arriba redondeadas y la base plana, anclada a la línea base. */
  function barPath(x: number, height: number): string {
    if (height <= 0) return '';
    const y = BASELINE_Y - height;
    const r = Math.min(RADIUS, height / 2, BAR_WIDTH / 2);
    return [
      `M ${x} ${BASELINE_Y}`,
      `L ${x} ${y + r}`,
      `Q ${x} ${y} ${x + r} ${y}`,
      `L ${x + BAR_WIDTH - r} ${y}`,
      `Q ${x + BAR_WIDTH} ${y} ${x + BAR_WIDTH} ${y + r}`,
      `L ${x + BAR_WIDTH} ${BASELINE_Y}`,
      'Z',
    ].join(' ');
  }
</script>

<div class="revenue-chart">
  <table class="sr-only">
    <caption>{$t('dash.chart_title')}</caption>
    <thead>
      <tr>
        <th>{$t('dash.chart_col_day')}</th>
        <th>{$t('dash.chart_col_amount')}</th>
      </tr>
    </thead>
    <tbody>
      {#each points as point (point.date.toISOString())}
        <tr>
          <td>{fmtWeekdayShort(point.date, locale)}</td>
          <td>${point.amount.toFixed(2)}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <svg viewBox={`0 0 ${totalWidth} ${TOP_GUTTER + CHART_HEIGHT + AXIS_GUTTER}`} class="chart-svg" aria-hidden="true">
    <line x1="0" y1={BASELINE_Y} x2={totalWidth} y2={BASELINE_Y} class="baseline" />
    {#each points as point, i (point.date.toISOString())}
      {@const x = i * (BAR_WIDTH + GAP)}
      {@const h = barHeight(point.amount)}
      <path d={barPath(x, h)} class="bar" class:bar-today={isSameCalendarDay(point.date, today)} />
      {#if point.amount > 0}
        <text x={x + BAR_WIDTH / 2} y={BASELINE_Y - h - 6} class="bar-label" text-anchor="middle">
          {point.amount >= 1000 ? `${(point.amount / 1000).toFixed(1)}k` : point.amount.toFixed(0)}
        </text>
      {/if}
      <text x={x + BAR_WIDTH / 2} y={BASELINE_Y + 20} class="axis-label" text-anchor="middle">
        {fmtWeekdayShort(point.date, locale)}
      </text>
    {/each}
  </svg>
</div>

<style>
  .revenue-chart {
    --bar-fill: #00d9a3;
    --axis-ink: #8891a8;
    --label-ink: #e8ecf4;
  }
  @media (prefers-color-scheme: light) {
    .revenue-chart {
      --bar-fill: #008300;
      --axis-ink: #62697c;
      --label-ink: #1a2233;
    }
  }
  :global([data-theme='light']) .revenue-chart {
    --bar-fill: #008300;
    --axis-ink: #62697c;
    --label-ink: #1a2233;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .chart-svg {
    width: 100%;
    height: auto;
    overflow: visible;
    font-family: inherit;
  }

  .baseline {
    stroke: var(--axis-ink);
    stroke-width: 1;
    opacity: 0.4;
  }

  .bar {
    fill: var(--bar-fill);
    opacity: 0.55;
    transition: opacity 0.15s;
  }

  .bar-today {
    opacity: 1;
  }

  .bar-label {
    font-size: 10px;
    fill: var(--label-ink);
    font-variant-numeric: tabular-nums;
  }

  .axis-label {
    font-size: 10px;
    fill: var(--axis-ink);
  }
</style>
