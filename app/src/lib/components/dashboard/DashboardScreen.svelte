<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t, locale } from '../../stores/locale';
  import { currentBusinessId } from '../../stores/session';
  import { appointments as appointmentsStore } from '../../stores/appointments';
  import { services as servicesStore } from '../../stores/services';
  import { invoices as invoicesStore } from '../../stores/invoices';
  import { customerCredits as creditsStore, customers as customersStore } from '../../stores/customers';
  import { activePeriod } from '../../stores/dashboard';
  import { calculateDashboardTotals, todaysAppointments, last7DaysRevenue, type DashboardPeriod } from '../../utils/dashboard';
  import { apptServicesLabel, getAppointmentClientName } from '../../utils/appointments';
  import { apptStatusLabel, type AppointmentStatus } from '../../utils/labels';
  import { fmtTime } from '../../utils/format';
  import { loadAppointments } from '../../actions/appointments';
  import { loadServices } from '../../actions/services';
  import { loadInvoices } from '../../actions/invoices';
  import { loadCustomers, loadCredits } from '../../actions/customers';
  import RevenueChart from './RevenueChart.svelte';

  /**
   * El Dashboard es la sección de entrada de la app (`activeSection` arranca
   * ahí) -- no puede depender de que antes se haya visitado Agenda/Facturas/
   * Configuración para que estos stores compartidos ya tengan datos. Cada
   * screen debe cargar lo que necesita, no asumir el efecto secundario de
   * otra.
   */
  onMount(() => {
    const businessId = get(currentBusinessId);
    if (!businessId) return;
    void loadAppointments(businessId);
    void loadServices(businessId);
    void loadInvoices(businessId);
    void loadCustomers(businessId);
    void loadCredits(businessId);
  });

  const PERIODS: { key: DashboardPeriod; labelKey: 'dash.period_today' | 'dash.period_week' | 'dash.period_month' }[] = [
    { key: 'today', labelKey: 'dash.period_today' },
    { key: 'week', labelKey: 'dash.period_week' },
    { key: 'month', labelKey: 'dash.period_month' },
  ];

  const now = new Date();

  const totals = $derived(
    calculateDashboardTotals(now, $activePeriod, $appointmentsStore, $servicesStore, $invoicesStore, $creditsStore)
  );
  const todaysList = $derived(todaysAppointments(now, $appointmentsStore));
  const todaysListPreview = $derived(todaysList.slice(0, 6));
  const chartPoints = $derived(last7DaysRevenue(now, $appointmentsStore, $servicesStore, $invoicesStore, $creditsStore));
</script>

<section aria-labelledby="dashboard-title">
  <h1 id="dashboard-title">{$t('nav.dashboard')}</h1>

  <div role="group" aria-label={$t('nav.dashboard')}>
    {#each PERIODS as period (period.key)}
      <button
        type="button"
        aria-pressed={$activePeriod === period.key}
        onclick={() => activePeriod.set(period.key)}
      >
        {$t(period.labelKey)}
      </button>
    {/each}
  </div>

  <div class="metrics-grid">
    <div class="card agenda-metric">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>{$t('dash.appts_today_title')}</h2>
        <span>{$t(todaysList.length === 1 ? 'dash.appt_count' : 'dash.appt_count_plural', { n: todaysList.length })}</span>
      </div>
      {#if todaysListPreview.length === 0}
        <p>{$t('dash.no_appts_today')}</p>
      {:else}
        <ul>
          {#each todaysListPreview as appt (appt.id)}
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

    <div class="card hero-metric">
      <span>{$t('dash.income_title')}</span>
      <div class="val-large">${totals.netProfit.toFixed(2)}</div>
      <span>{$t('dash.income_hint')}</span>
    </div>

    <div class="card receivables-metric">
      <span>{$t('dash.receivables_title')}</span>
      <div class="val-large">${totals.totalReceivables.toFixed(2)}</div>
      <span>{$t('dash.receivables_hint')}</span>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>{$t('dash.chart_title')}</h2>
      <span>{$t('dash.chart_subtitle')}</span>
    </div>
    <RevenueChart points={chartPoints} locale={$locale} />
  </div>
</section>

<style>
  /* Acentos de color por tarjeta, igual que el diseño original (legado):
     agenda en violeta, ingresos en verde, cuentas por cobrar en ámbar. */
  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (min-width: 640px) {
    .metrics-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  .agenda-metric {
    grid-column: 1 / -1;
    border-left: 4px solid var(--accent-agenda);
  }
  .hero-metric {
    grid-column: 1 / -1;
    border-left: 4px solid var(--accent-profit);
  }
  .receivables-metric {
    border-left: 4px solid var(--accent-recommend);
  }
</style>
