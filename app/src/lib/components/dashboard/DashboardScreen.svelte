<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t, locale } from '../../stores/locale';
  import { currentBusinessId, currentBusiness } from '../../stores/session';
  import { appointments as appointmentsStore } from '../../stores/appointments';
  import { services as servicesStore } from '../../stores/services';
  import { invoices as invoicesStore } from '../../stores/invoices';
  import { customerCredits as creditsStore, customers as customersStore } from '../../stores/customers';
  import { employees as employeesStore } from '../../stores/employees';
  import { activePeriod } from '../../stores/dashboard';
  import {
    calculateDashboardTotals,
    todaysAppointments,
    last7DaysRevenue,
    periodAppointmentsCount,
    type DashboardPeriod,
  } from '../../utils/dashboard';
  import { receivablesByCustomer } from '../../utils/customerAccount';
  import { apptServicesLabel, getAppointmentClientName } from '../../utils/appointments';
  import { apptStatusLabel, type AppointmentStatus } from '../../utils/labels';
  import { fmtTime, fmtDateLong } from '../../utils/format';
  import { loadAppointments } from '../../actions/appointments';
  import { loadServices } from '../../actions/services';
  import { loadInvoices } from '../../actions/invoices';
  import { loadCustomers, loadCredits } from '../../actions/customers';
  import { loadEmployees } from '../../actions/employees';
  import type { TranslationKey } from '../../i18n';
  import RevenueChart from './RevenueChart.svelte';

  export type DashboardNavTarget = 'agenda-new' | 'agenda-view' | 'services' | 'customers' | 'employees';

  interface Props {
    onNavigate: (target: DashboardNavTarget) => void;
  }

  const { onNavigate }: Props = $props();

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
    void loadEmployees(businessId);
  });

  const PERIODS: { key: DashboardPeriod; labelKey: 'dash.period_today' | 'dash.period_week' | 'dash.period_month' }[] = [
    { key: 'today', labelKey: 'dash.period_today' },
    { key: 'week', labelKey: 'dash.period_week' },
    { key: 'month', labelKey: 'dash.period_month' },
  ];

  const HERO_TITLE_KEY: Record<DashboardPeriod, TranslationKey> = {
    today: 'dash.hero_title_today',
    week: 'dash.hero_title_week',
    month: 'dash.hero_title_month',
  };

  const now = new Date();

  const greeting = $derived(
    now.getHours() < 12
      ? $t('dash.greeting_morning')
      : now.getHours() < 19
        ? $t('dash.greeting_afternoon')
        : $t('dash.greeting_evening')
  );
  const todayLabel = $derived(fmtDateLong(now, $locale));

  const isGroup = $derived($currentBusiness?.business_type === 'group');
  /** Sin ninguna cita todavía, el dashboard de números no dice nada útil -- se muestra el checklist de primeros pasos en su lugar. */
  const isNewAccount = $derived($appointmentsStore.length === 0);

  const totals = $derived(
    calculateDashboardTotals(now, $activePeriod, $appointmentsStore, $servicesStore, $invoicesStore, $creditsStore)
  );
  const todayTotals = $derived(
    calculateDashboardTotals(now, 'today', $appointmentsStore, $servicesStore, $invoicesStore, $creditsStore)
  );
  const periodApptCount = $derived(periodAppointmentsCount(now, $activePeriod, $appointmentsStore));
  const todaysList = $derived(todaysAppointments(now, $appointmentsStore));
  const todaysListPreview = $derived(todaysList.slice(0, 6));
  const chartPoints = $derived(last7DaysRevenue(now, $appointmentsStore, $servicesStore, $invoicesStore, $creditsStore));
  const receivables = $derived(receivablesByCustomer($creditsStore, $customersStore).slice(0, 4));

  interface SetupStep {
    key: string;
    titleKey: TranslationKey;
    descKey?: TranslationKey;
    btnKey?: TranslationKey;
    navTarget?: DashboardNavTarget;
    done: boolean;
  }

  const setupSteps = $derived.by((): SetupStep[] => {
    const steps: SetupStep[] = [
      { key: 'business', titleKey: 'dash.setup_step1_title', done: true },
      {
        key: 'services',
        titleKey: 'dash.setup_step2_title',
        descKey: 'dash.setup_step2_desc',
        btnKey: 'dash.setup_step2_btn',
        navTarget: 'services',
        done: $servicesStore.length > 0,
      },
      {
        key: 'customers',
        titleKey: 'dash.setup_step3_title',
        descKey: 'dash.setup_step3_desc',
        btnKey: 'dash.setup_step3_btn',
        navTarget: 'customers',
        done: $customersStore.length > 0,
      },
      {
        key: 'appointment',
        titleKey: 'dash.setup_step4_title',
        descKey: 'dash.setup_step4_desc',
        btnKey: 'dash.new_appt_btn',
        navTarget: 'agenda-new',
        done: false,
      },
    ];
    if (isGroup) {
      steps.push({
        key: 'team',
        titleKey: 'dash.setup_step5_title',
        descKey: 'dash.setup_step5_desc',
        btnKey: 'dash.setup_step5_btn',
        navTarget: 'employees',
        done: $employeesStore.length > 1,
      });
    }
    return steps;
  });
  const doneCount = $derived(setupSteps.filter((s) => s.done).length);
  const currentStepIndex = $derived(setupSteps.findIndex((s) => !s.done));
</script>

<section aria-labelledby="dashboard-title" class="dash-theme">
  <header class="dash-top">
    <div>
      <h1 id="dashboard-title">{greeting}</h1>
      <p class="dash-date">{todayLabel}</p>
    </div>
    <button type="button" class="btn-new-appt" onclick={() => onNavigate('agenda-new')}>
      <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      {$t('dash.new_appt_btn')}
    </button>
  </header>

  {#if isNewAccount}
    <div class="card-dash">
      <div class="row-head">
        <div>
          <h2 id="setup-title">{$t('dash.setup_title')}</h2>
          <p class="sub">{$t('dash.setup_subtitle')}</p>
        </div>
        <span class="sub">{$t('dash.setup_progress', { n: doneCount, total: setupSteps.length })}</span>
      </div>
      <div
        class="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={setupSteps.length}
        aria-valuenow={doneCount}
        aria-labelledby="setup-title"
      >
        <i style="width: {(doneCount / setupSteps.length) * 100}%"></i>
      </div>
      <ol class="steps">
        {#each setupSteps as step, i (step.key)}
          <li class="step" class:done={step.done} class:now={!step.done && i === currentStepIndex} class:later={!step.done && i !== currentStepIndex}>
            <span class="dot">
              {#if step.done}
                <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              {:else}
                {i + 1}
              {/if}
            </span>
            <div>
              <h3>{$t(step.titleKey)}</h3>
              {#if step.descKey}<p>{$t(step.descKey)}</p>{/if}
            </div>
            {#if !step.done && step.btnKey && step.navTarget}
              {@const target = step.navTarget}
              <button type="button" class="btn-ghost-dash" onclick={() => onNavigate(target)}>{$t(step.btnKey)}</button>
            {:else}
              <span></span>
            {/if}
          </li>
        {/each}
      </ol>
    </div>

    <div class="strip">
      <span><b>{todaysList.length}</b>{$t('dash.setup_strip_appts')}</span>
      <span><b>${todayTotals.netProfit.toFixed(2)}</b>{$t('dash.setup_strip_collected')}</span>
      <span><b>${totals.totalReceivables.toFixed(2)}</b>{$t('dash.setup_strip_receivable')}</span>
    </div>
  {:else}
    <div class="row-head">
      <h2 id="summary-title">{$t('dash.summary_title')}</h2>
      <div role="group" aria-labelledby="summary-title" class="periodo">
        {#each PERIODS as period (period.key)}
          <button type="button" aria-pressed={$activePeriod === period.key} onclick={() => activePeriod.set(period.key)}>
            {$t(period.labelKey)}
          </button>
        {/each}
      </div>
    </div>

    <div class="kpis">
      <div class="card-dash kpi hero">
        <span class="kpi-label">{$t(HERO_TITLE_KEY[$activePeriod])}</span>
        <span class="kpi-num">${totals.netProfit.toFixed(2)}</span>
        <p class="kpi-note">{$t('dash.income_hint')}</p>
      </div>
      <div class="card-dash kpi">
        <span class="kpi-label">{$t('dash.appts_kpi_title')}</span>
        <span class="kpi-num">{periodApptCount}</span>
      </div>
      <div class="card-dash kpi warn">
        <span class="kpi-label">{$t('dash.receivables_title')}</span>
        <span class="kpi-num">${totals.totalReceivables.toFixed(2)}</span>
        <p class="kpi-note">{$t('dash.receivables_hint')}</p>
      </div>
    </div>

    <div class="cols">
      <section class="card-dash" aria-labelledby="agenda-today-title">
        <div class="row-head">
          <div>
            <h2 id="agenda-today-title">{$t('dash.appts_today_title')}</h2>
            <p class="sub">
              {$t(todaysList.length === 1 ? 'dash.appt_count' : 'dash.appt_count_plural', { n: todaysList.length })}
              {#if todaysList[0]}
                · {$t('dash.next_appt_at', { time: fmtTime(todaysList[0].start_at, $locale) })}
              {/if}
            </p>
          </div>
          <button type="button" class="link-dash" onclick={() => onNavigate('agenda-view')}>{$t('dash.agenda_view_link')}</button>
        </div>
        {#if todaysListPreview.length === 0}
          <p>{$t('dash.no_appts_today')}</p>
        {:else}
          <ul class="cita-list">
            {#each todaysListPreview as appt (appt.id)}
              <li class="cita">
                <time>{fmtTime(appt.start_at, $locale)}</time>
                <div>
                  <b>{getAppointmentClientName(appt, $customersStore, $t('appt.walkin_fallback'))}</b>
                  <span>{apptServicesLabel(appt, $servicesStore)}</span>
                </div>
                <span class="badge-status status-{appt.status}">{apptStatusLabel(appt.status as AppointmentStatus, $locale)}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <div class="cols-side">
        <section class="card-dash" aria-labelledby="chart-title">
          <h2 id="chart-title">{$t('dash.chart_title')}</h2>
          <p class="sub">{$t('dash.chart_subtitle')}</p>
          <RevenueChart points={chartPoints} locale={$locale} />
        </section>

        <section class="card-dash" aria-labelledby="receivables-by-customer-title">
          <div class="row-head">
            <h2 id="receivables-by-customer-title">{$t('dash.receivables_by_customer_title')}</h2>
            <button type="button" class="link-dash" onclick={() => onNavigate('customers')}>
              {$t('dash.receivables_by_customer_link')}
            </button>
          </div>
          {#if receivables.length === 0}
            <p>{$t('dash.receivables_by_customer_empty')}</p>
          {:else}
            <ul class="deuda-list">
              {#each receivables as r (r.customerId)}
                <li class="deuda"><span>{r.name}</span><b>${r.amount.toFixed(2)}</b></li>
              {/each}
            </ul>
          {/if}
        </section>
      </div>
    </div>
  {/if}
</section>

<style>
  /*
   * Mismo criterio que Agenda/Login/Landing/Onboarding: un tema local con
   * sus propios tokens, autocontenido dentro de esta sección -- no toca el
   * fondo oscuro global (`body`/`.content`) que todavía usan Facturas/
   * Equipo/Configuración, así que no las descoloca.
   */
  .dash-theme {
    --dt-ciruela: #6e1f45;
    --dt-burdeos: #4a1230;
    --dt-rosa: #e98f8f;
    --dt-oro: #d9b270;
    --dt-tinta: #3a1a2a;
    --dt-suave: #7d5a6c;
    --dt-campo: #f7eef1;
    --dt-linea: #ebdce3;
    --dt-fondo: #fcf8f9;
    --dt-ok: #2f7a5b;
    --dt-ok-bg: #e4f3ec;
    --dt-pend: #a9651c;
    --dt-pend-bg: #fbebd3;
    --dt-serif: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    --dt-sans: 'Jost', 'Segoe UI', system-ui, sans-serif;

    background: var(--dt-fondo);
    color: var(--dt-tinta);
    font-family: var(--dt-sans);
    border-radius: 24px;
    margin: -1.25rem -1.25rem 0;
    padding: 1.75rem 1.75rem 2.5rem;
    box-sizing: border-box;
    /* Sin esto, con poco contenido (el checklist recién empezado) el
       `.content` de al lado se estira igual a la altura del menú lateral
       (comportamiento por defecto de grid) y deja ver el fondo oscuro
       global debajo de esta tarjeta clara. */
    min-height: calc(100vh - 1.25rem);
  }

  .dash-theme :global(svg.i) {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
    flex: none;
  }

  .dash-top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .dash-top h1 {
    font-family: var(--dt-serif);
    font-weight: 600;
    font-size: 2.2rem;
    line-height: 1;
    color: var(--dt-ciruela);
    margin: 0;
  }

  .dash-date {
    margin: 0.5rem 0 0;
    color: var(--dt-suave);
  }

  .btn-new-appt {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    height: 46px;
    padding: 0 1.5rem;
    border: 0;
    border-radius: 999px;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    background: linear-gradient(90deg, var(--dt-burdeos), #a33b5f);
    box-shadow: 0 10px 22px rgba(110, 31, 69, 0.28);
  }

  .card-dash {
    background: #fff;
    border: 1px solid var(--dt-linea);
    border-radius: 16px;
    padding: 1.4rem 1.5rem;
    margin-top: 1rem;
  }

  .card-dash h2 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--dt-tinta);
    margin: 0;
  }

  .card-dash .sub {
    margin: 0.15rem 0 0;
    color: var(--dt-suave);
    font-size: 0.9rem;
  }

  .row-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.9rem;
  }

  .link-dash {
    background: none;
    border: 0;
    padding: 0;
    color: var(--dt-ciruela);
    font-weight: 500;
    font-size: 0.9rem;
    cursor: pointer;
    border-bottom: 1px solid rgba(110, 31, 69, 0.3);
  }

  .link-dash:hover {
    border-bottom-color: var(--dt-ciruela);
  }

  /* Checklist de primeros pasos */
  .progress {
    height: 8px;
    border-radius: 999px;
    background: var(--dt-campo);
    overflow: hidden;
    margin-bottom: 0.4rem;
  }

  .progress i {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--dt-oro), var(--dt-rosa));
  }

  .steps {
    list-style: none;
    padding: 0;
    margin: 0.6rem 0 0;
  }

  .step {
    display: grid;
    grid-template-columns: 34px 1fr auto;
    gap: 0.9rem;
    align-items: center;
    padding: 1rem 0;
    border-top: 1px solid var(--dt-linea);
  }

  .step:first-child {
    border-top: 0;
  }

  .dot {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--dt-suave);
    border: 1.5px solid var(--dt-linea);
  }

  .step.done .dot {
    background: linear-gradient(135deg, var(--dt-ciruela), var(--dt-rosa));
    border-color: transparent;
    color: #fff;
  }

  .step.now .dot {
    border-color: var(--dt-rosa);
    color: var(--dt-ciruela);
    box-shadow: 0 0 0 4px rgba(233, 143, 143, 0.2);
  }

  .step h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }

  .step.done h3 {
    color: var(--dt-suave);
    font-weight: 500;
  }

  .step p {
    margin: 0.15rem 0 0;
    font-size: 0.9rem;
    color: var(--dt-suave);
  }

  .btn-ghost-dash {
    height: 40px;
    padding: 0 1.1rem;
    border-radius: 999px;
    background: #fff;
    color: var(--dt-ciruela);
    border: 1.5px solid var(--dt-linea);
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .step.later .btn-ghost-dash {
    color: var(--dt-suave);
  }

  .strip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 2.1rem;
    margin-top: 1.1rem;
    padding: 1rem 1.5rem;
    border: 1px dashed #d9c2cd;
    border-radius: 16px;
    color: var(--dt-suave);
    font-size: 0.95rem;
  }

  .strip b {
    color: var(--dt-tinta);
    font-family: var(--dt-serif);
    font-size: 1.35rem;
    font-weight: 600;
    margin-right: 0.4rem;
  }

  /* Con datos: KPIs */
  .periodo {
    display: inline-flex;
    padding: 4px;
    border-radius: 999px;
    background: #fff;
    border: 1px solid var(--dt-linea);
  }

  .periodo button {
    border: 0;
    background: transparent;
    padding: 0.45rem 1.1rem;
    border-radius: 999px;
    cursor: pointer;
    color: var(--dt-suave);
    font-weight: 500;
    font-size: 0.92rem;
  }

  .periodo button[aria-pressed='true'] {
    background: var(--dt-ciruela);
    color: #fff;
  }

  .kpis {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (min-width: 640px) {
    .kpis {
      grid-template-columns: 1.5fr 1fr 1fr;
    }
  }

  .kpi {
    margin-top: 0;
    display: flex;
    flex-direction: column;
  }

  .kpi-label {
    font-size: 0.92rem;
    color: var(--dt-suave);
  }

  .kpi-num {
    display: block;
    margin-top: 0.5rem;
    font-family: var(--dt-serif);
    font-weight: 600;
    font-size: 2.4rem;
    line-height: 1;
    color: var(--dt-tinta);
  }

  .kpi-note {
    margin: 0.75rem 0 0;
    font-size: 0.88rem;
    color: var(--dt-suave);
  }

  .kpi.hero {
    color: #fff;
    background: linear-gradient(140deg, #4a1230 0%, #8e2c55 62%, #e4737f 130%);
    border: 0;
  }

  .kpi.hero .kpi-label,
  .kpi.hero .kpi-note {
    color: rgba(255, 255, 255, 0.85);
  }

  .kpi.hero .kpi-num {
    color: #fff;
    font-size: 2.9rem;
  }

  .kpi.warn .kpi-num {
    color: var(--dt-pend);
  }

  .cols {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-top: 1rem;
    align-items: start;
  }

  @media (min-width: 900px) {
    .cols {
      grid-template-columns: 1.5fr 1fr;
    }
  }

  .cols-side {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cols-side .card-dash {
    margin-top: 0;
  }

  .cita-list,
  .deuda-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .cita {
    display: grid;
    grid-template-columns: 58px 1fr auto;
    gap: 0.9rem;
    align-items: center;
    padding: 0.8rem 0;
    border-top: 1px solid var(--dt-linea);
  }

  .cita:first-child {
    border-top: 0;
  }

  .cita time {
    font-weight: 600;
    color: var(--dt-ciruela);
    font-variant-numeric: tabular-nums;
  }

  .cita b {
    display: block;
    font-weight: 500;
  }

  .cita span {
    font-size: 0.88rem;
    color: var(--dt-suave);
  }

  .deuda {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.7rem 0;
    border-top: 1px solid var(--dt-linea);
    font-size: 0.95rem;
  }

  .deuda:first-child {
    border-top: 0;
  }

  .deuda b {
    font-weight: 600;
    color: var(--dt-pend);
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 640px) {
    .dash-theme {
      padding: 1.25rem 1.1rem 2rem;
    }

    .dash-top h1 {
      font-size: 1.7rem;
    }

    .btn-new-appt {
      width: 100%;
      justify-content: center;
    }

    .step {
      grid-template-columns: 34px 1fr;
    }

    .step .btn-ghost-dash {
      grid-column: 2;
      justify-self: start;
    }

    .step > span:empty {
      display: none;
    }
  }
</style>
