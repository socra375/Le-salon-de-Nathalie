<script lang="ts">
  import { t, locale } from '../../stores/locale';
  import { appointments as appointmentsStore } from '../../stores/appointments';
  import { services as servicesStore } from '../../stores/services';
  import { invoices as invoicesStore } from '../../stores/invoices';
  import { customerCredits as creditsStore, customers as customersStore } from '../../stores/customers';
  import { currentBusiness } from '../../stores/session';
  import { activePeriod, selectedDay } from '../../stores/dashboard';
  import {
    calculateDashboardTotals,
    appointmentsForDay,
    appointmentsInPeriod,
    customerActivityInPeriod,
    percentChange,
    previousPeriodReference,
    last7DaysRevenue,
    type DashboardPeriod,
  } from '../../utils/dashboard';
  import { apptServicesLabel, getAppointmentClientName } from '../../utils/appointments';
  import { apptStatusLabel, type AppointmentStatus } from '../../utils/labels';
  import { fmtTime, fmtDate } from '../../utils/format';
  import { isSameCalendarDay, toDateInputValue } from '../../utils/dates';
  import RevenueChart from './RevenueChart.svelte';

  const PERIODS: { key: DashboardPeriod; labelKey: 'dash.period_today' | 'dash.period_week' | 'dash.period_month' }[] = [
    { key: 'today', labelKey: 'dash.period_today' },
    { key: 'week', labelKey: 'dash.period_week' },
    { key: 'month', labelKey: 'dash.period_month' },
  ];

  const realNow = new Date();
  const maxPickableDate = toDateInputValue(realNow);

  const greetingKey = $derived(
    realNow.getHours() < 12
      ? 'dash.greeting_morning'
      : realNow.getHours() < 19
        ? 'dash.greeting_afternoon'
        : 'dash.greeting_evening'
  );

  // El día bajo foco: el elegido en el selector cuando el período es "Hoy"
  // (puede ser cualquier día pasado); el día real en Semana/Mes, donde el
  // selector de fecha no aparece.
  const focusDay = $derived($activePeriod === 'today' ? new Date(`${$selectedDay}T00:00:00`) : realNow);
  const isFocusToday = $derived(isSameCalendarDay(focusDay, realNow));

  const totals = $derived(
    calculateDashboardTotals(focusDay, $activePeriod, $appointmentsStore, $servicesStore, $invoicesStore, $creditsStore)
  );
  const appointmentCount = $derived(appointmentsInPeriod($activePeriod, focusDay, $appointmentsStore).length);

  const previousRef = $derived(previousPeriodReference($activePeriod, focusDay));
  const previousTotals = $derived(
    calculateDashboardTotals(previousRef, $activePeriod, $appointmentsStore, $servicesStore, $invoicesStore, $creditsStore)
  );
  const previousAppointmentCount = $derived(appointmentsInPeriod($activePeriod, previousRef, $appointmentsStore).length);

  const incomeTrend = $derived(percentChange(totals.netProfit, previousTotals.netProfit));
  const appointmentsTrend = $derived(percentChange(appointmentCount, previousAppointmentCount));

  const customerActivity = $derived(customerActivityInPeriod($activePeriod, focusDay, $appointmentsStore, $customersStore));

  const focusList = $derived(appointmentsForDay(focusDay, $appointmentsStore));
  const focusListPreview = $derived(focusList.slice(0, 6));

  const chartPoints = $derived(last7DaysRevenue(realNow, $appointmentsStore, $servicesStore, $invoicesStore, $creditsStore));

  const pendingClientsCount = $derived(
    new Set($creditsStore.filter((c) => c.status !== 'pagado').map((c) => c.customer_id)).size
  );

  function trendArrow(pct: number): string {
    return pct >= 0 ? '▲' : '▼';
  }
</script>

{#snippet trendBadge(pct: number | null)}
  {#if pct === null}
    <span class="trend trend-new">{$t('dash.trend_new')}</span>
  {:else}
    {@const rounded = Math.abs(Math.round(pct))}
    <span class="trend" class:trend-up={pct >= 0} class:trend-down={pct < 0}>
      <span aria-hidden="true">{trendArrow(pct)} {rounded}%</span>
      <span class="sr-only">{$t(pct >= 0 ? 'dash.trend_up_aria' : 'dash.trend_down_aria', { pct: rounded })}</span>
    </span>
  {/if}
{/snippet}

<section aria-labelledby="dashboard-title" class="dashboard">
  <header class="dash-greeting">
    <p class="eyebrow">
      {$t(greetingKey)}{$currentBusiness?.name ? `, ${$currentBusiness.name}` : ''}
      <span aria-hidden="true">👋</span>
    </p>
    <h1 id="dashboard-title">{$t('nav.dashboard')}</h1>
    <p class="subtitle">{$t('dash.greeting_subtitle')}</p>
  </header>

  <div role="group" aria-label={$t('nav.dashboard')} class="period-toggle">
    {#each PERIODS as period (period.key)}
      <button type="button" aria-pressed={$activePeriod === period.key} onclick={() => activePeriod.set(period.key)}>
        {$t(period.labelKey)}
      </button>
    {/each}
    {#if $activePeriod === 'today'}
      <label class="date-pick">
        <span>{$t('dash.pick_date_label')}</span>
        <input type="date" bind:value={$selectedDay} max={maxPickableDate} />
      </label>
    {/if}
  </div>

  <div class="stat-grid">
    <div class="card stat-card">
      <span class="stat-title">{$t('dash.stat_appointments_title')}</span>
      <div class="stat-value">{appointmentCount}</div>
      {@render trendBadge(appointmentsTrend)}
    </div>

    <div class="card stat-card stat-card-profit">
      <span class="stat-title">{$t('dash.stat_income_title')}</span>
      <div class="stat-value">${totals.netProfit.toFixed(2)}</div>
      {@render trendBadge(incomeTrend)}
      <span class="stat-hint">{$t('dash.income_hint')}</span>
    </div>

    <div class="card stat-card stat-card-pending">
      <span class="stat-title">{$t('dash.stat_pending_title')}</span>
      <div class="stat-value">${totals.totalReceivables.toFixed(2)}</div>
      <span class="stat-hint">
        {$t(pendingClientsCount === 1 ? 'dash.pending_clients_count' : 'dash.pending_clients_count_plural', {
          n: pendingClientsCount,
        })}
      </span>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>
        {isFocusToday ? $t('dash.appts_today_title') : $t('dash.appts_for_date_title', { date: fmtDate(focusDay, $locale) })}
      </h2>
      <span>{$t(focusList.length === 1 ? 'dash.appt_count' : 'dash.appt_count_plural', { n: focusList.length })}</span>
    </div>
    {#if focusListPreview.length === 0}
      <p>{isFocusToday ? $t('dash.no_appts_today') : $t('dash.no_appts_for_date')}</p>
    {:else}
      <ul>
        {#each focusListPreview as appt (appt.id)}
          <li>
            <span>
              {fmtTime(appt.start_at, $locale)} — {getAppointmentClientName(appt, $customersStore, $t('appt.walkin_fallback'))}
              ({apptServicesLabel(appt, $servicesStore)})
            </span>
            <span class="badge-status">{apptStatusLabel(appt.status as AppointmentStatus, $locale)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="card card-accent-agenda">
    <div class="card-header">
      <h2>{$t('dash.chart_title')}</h2>
      <span class="stat-hint">{$t('dash.chart_subtitle')}</span>
    </div>
    <RevenueChart points={chartPoints} locale={$locale} />
  </div>

  <div class="card">
    <h2>{$t('dash.customers_section_title')}</h2>
    <div class="customer-grid">
      <div>
        <span class="stat-title">{$t('dash.new_customers_label')}</span>
        <div class="stat-value">{customerActivity.newCustomers}</div>
      </div>
      <div>
        <span class="stat-title">{$t('dash.returning_customers_label')}</span>
        <div class="stat-value">{customerActivity.returningCustomers}</div>
      </div>
    </div>
  </div>
</section>

<style>
  /* Colores/tipografía de marca (bg-card, text-*, accent-*, fuentes) viven
     en app.css a nivel global desde la Fase 7 -- acá solo lo específico
     de este componente. */
  .dashboard {
    --trend-up: #0ca30c;
    --trend-down: #e66767;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .dash-greeting .eyebrow {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin: 0 0 0.25rem;
  }
  .dash-greeting h1 {
    margin: 0;
  }
  .dash-greeting .subtitle {
    color: var(--text-muted);
    margin: 0.25rem 0 0;
  }

  .period-toggle {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .date-pick {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .card-accent-agenda {
    border-left: 4px solid var(--accent-agenda);
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }
  .stat-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .stat-card-profit {
    border-left: 4px solid var(--accent-profit);
  }
  .stat-card-pending {
    border-left: 4px solid var(--accent-recommend);
  }
  .stat-title {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .stat-hint {
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .trend {
    font-weight: 600;
    font-size: 0.9rem;
    width: fit-content;
  }
  .trend-up {
    color: var(--trend-up);
  }
  .trend-down {
    color: var(--trend-down);
  }
  .trend-new {
    color: var(--text-muted);
    font-weight: 500;
  }

  .customer-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    margin-top: 0.5rem;
  }
</style>
