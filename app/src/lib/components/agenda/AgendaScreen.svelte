<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t, locale } from '../../stores/locale';
  import { currentBusinessId, currentBusiness } from '../../stores/session';
  import { appointments as appointmentsStore } from '../../stores/appointments';
  import { services as servicesStore } from '../../stores/services';
  import { customers as customersStore } from '../../stores/customers';
  import { invoices as invoicesStore } from '../../stores/invoices';
  import { changeAppointmentStatus } from '../../actions/appointments';
  import { loadInvoices, createInvoiceForAppointment } from '../../actions/invoices';
  import { completeAppointment } from '../../actions/completeAppointment';
  import { loadSpecialistOptions, type SpecialistOption } from '../../actions/services';
  import { toDateInputValue } from '../../utils/dates';
  import { fmtDate, fmtTime } from '../../utils/format';
  import { apptServices, apptServicesLabel, getAppointmentClientName } from '../../utils/appointments';
  import { apptStatusLabel, type AppointmentStatus } from '../../utils/labels';
  import type { PaymentMethodKey } from '../../utils/payments';
  import { buildInvoicePdf, openInvoicePdf, loadImageAsDataURL } from '../../pdf/invoicePdf';
  import AppointmentForm from './AppointmentForm.svelte';
  import PaymentMethodModal from './PaymentMethodModal.svelte';
  import type { Tables } from '../../types/database.types';

  let businessId = $state<string | null>(null);
  let specialistOptions = $state<SpecialistOption[]>([]);
  let selectedDate = $state(toDateInputValue(new Date()));
  let formOpen = $state(false);
  let payingAppt = $state<Tables<'appointments'> | null>(null);
  let payingMode = $state<'complete' | 'retry'>('complete');
  let pendingChange = $state<{ apptId: string; status: AppointmentStatus; label: string } | null>(null);
  let errorMessage = $state('');

  const invoicedAppointmentIds = $derived(
    new Set($invoicesStore.filter((inv) => inv.appointment_id).map((inv) => inv.appointment_id as string))
  );
  const dayAppointments = $derived(
    $appointmentsStore.filter((a) => toDateInputValue(new Date(a.start_at)) === selectedDate)
  );
  const isToday = $derived(selectedDate === toDateInputValue(new Date()));

  onMount(() => {
    businessId = get(currentBusinessId);
    if (!businessId) return;
    void loadInvoices(businessId);
    void loadSpecialistOptions(businessId, $t('appt.you_admin'), $t('appt.employee_unnamed')).then((options) => {
      specialistOptions = options;
    });
  });

  function goToToday() {
    selectedDate = toDateInputValue(new Date());
  }

  function clientNameFor(appt: Tables<'appointments'>): string {
    return getAppointmentClientName(appt, $customersStore, $t('appt.walkin_fallback'));
  }

  function specialistLabelFor(employeeId: string): string {
    return specialistOptions.find((o) => o.id === employeeId)?.label ?? $t('appt.specialist_fallback');
  }

  function requestStatusChange(apptId: string, status: AppointmentStatus, label: string) {
    pendingChange = { apptId, status, label };
  }

  async function confirmStatusChange() {
    if (!pendingChange || !businessId) return;
    const { apptId, status, label } = pendingChange;
    pendingChange = null;
    await changeAppointmentStatus(businessId, apptId, status, $t('act.appt_status_updated', { status: label }));
  }

  function startCompleting(appt: Tables<'appointments'>) {
    payingMode = 'complete';
    payingAppt = appt;
  }

  function startRetryInvoice(appt: Tables<'appointments'>) {
    payingMode = 'retry';
    payingAppt = appt;
  }

  async function handlePaymentConfirm(paymentMethod: PaymentMethodKey) {
    if (!payingAppt || !businessId) return;
    const appt = payingAppt;
    const mode = payingMode;
    payingAppt = null;
    errorMessage = '';

    const clientName = clientNameFor(appt);
    const business = $currentBusiness;

    try {
      const invoice =
        mode === 'complete'
          ? await completeAppointment({
              businessId,
              appt,
              services: $servicesStore,
              business,
              customerName: clientName,
              paymentMethod,
              statusActivityMessage: $t('act.appt_status_updated', {
                status: apptStatusLabel('completada', $locale),
              }),
              buildInvoiceActivityMessage: (number) => $t('act.invoice_generated', { number }),
            })
          : await createInvoiceForAppointment({
              businessId,
              appt,
              services: $servicesStore,
              business,
              customerId: appt.customer_id,
              customerName: clientName,
              paymentMethod,
              buildActivityMessage: (number) => $t('act.invoice_generated', { number }),
            });

      const customer = $customersStore.find((c) => c.id === invoice.customer_id) ?? null;
      const logo = business?.logo_url ? await loadImageAsDataURL(business.logo_url) : null;
      const doc = buildInvoicePdf({
        invoice,
        apptServices: apptServices(appt, $servicesStore),
        customer,
        business,
        specialistLabel: specialistLabelFor(appt.employee_id),
        locale: $locale,
        logo,
      });
      openInvoicePdf(doc);
    } catch (err) {
      errorMessage = $t('inv.error_generate', { msg: err instanceof Error ? err.message : String(err) });
    }
  }
</script>

<section aria-labelledby="agenda-title">
  <h1 id="agenda-title">{$t('appt.title')}</h1>
  <p>{$t('appt.subtitle')}</p>

  <div class="card">
    <label for="appt-date-picker">{$t('appt.date_label')}</label>
    <input id="appt-date-picker" type="date" bind:value={selectedDate} />
    <button type="button" onclick={goToToday}>{$t('appt.today_btn')}</button>

    {#if !formOpen}
      <button type="button" onclick={() => (formOpen = true)}>{$t('appt.new_btn')}</button>
    {/if}
  </div>

  {#if formOpen && businessId}
    <AppointmentForm
      {businessId}
      services={$servicesStore}
      {specialistOptions}
      customers={$customersStore}
      initialDate={selectedDate}
      onSaved={() => (formOpen = false)}
      onCancel={() => (formOpen = false)}
    />
  {/if}

  {#if errorMessage}
    <p role="alert">{errorMessage}</p>
  {/if}

  <div class="card table-responsive">
    <h3>{isToday ? $t('appt.list_title_today') : $t('appt.list_title_date', { date: fmtDate(`${selectedDate}T00:00:00`, $locale) })}</h3>

    {#if dayAppointments.length === 0}
      <p>{$t('appt.empty')}</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>{$t('appt.th_time')}</th>
            <th>{$t('appt.th_client')}</th>
            <th>{$t('appt.th_service')}</th>
            <th>{$t('appt.th_specialist')}</th>
            <th>{$t('appt.th_status')}</th>
            <th>{$t('appt.th_actions')}</th>
          </tr>
        </thead>
        <tbody>
          {#each dayAppointments as appt (appt.id)}
            <tr>
              <td>{fmtTime(appt.start_at, $locale)}</td>
              <td>{clientNameFor(appt)}</td>
              <td>{apptServicesLabel(appt, $servicesStore)}</td>
              <td>{specialistLabelFor(appt.employee_id)}</td>
              <td>{apptStatusLabel(appt.status as AppointmentStatus, $locale)}</td>
              <td>
                {#if pendingChange?.apptId === appt.id}
                  <span role="alertdialog" aria-label={$t('appt.confirm_status', { label: pendingChange.label })}>
                    {$t('appt.confirm_status', { label: pendingChange.label })}
                    <button type="button" onclick={confirmStatusChange}>{pendingChange.label}</button>
                    <button type="button" onclick={() => (pendingChange = null)}>{$t('common.cancel')}</button>
                  </span>
                {:else if appt.status === 'pendiente'}
                  <button type="button" onclick={() => requestStatusChange(appt.id, 'confirmada', $t('appt.btn_confirm'))}>
                    {$t('appt.btn_confirm')}
                  </button>
                  <button type="button" onclick={() => requestStatusChange(appt.id, 'cancelada', $t('appt.btn_cancel'))}>
                    {$t('appt.btn_cancel')}
                  </button>
                {:else if appt.status === 'confirmada'}
                  <button type="button" onclick={() => startCompleting(appt)}>{$t('appt.btn_complete')}</button>
                  <button type="button" onclick={() => requestStatusChange(appt.id, 'no_show', $t('appt.btn_noshow'))}>
                    {$t('appt.btn_noshow')}
                  </button>
                  <button type="button" onclick={() => requestStatusChange(appt.id, 'cancelada', $t('appt.btn_cancel'))}>
                    {$t('appt.btn_cancel')}
                  </button>
                {:else if appt.status === 'completada' && !invoicedAppointmentIds.has(appt.id)}
                  <button type="button" onclick={() => startRetryInvoice(appt)}>{$t('appt.btn_invoice')}</button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  {#if payingAppt}
    <PaymentMethodModal
      appt={payingAppt}
      clientName={clientNameFor(payingAppt)}
      services={$servicesStore}
      customers={$customersStore}
      business={$currentBusiness}
      onConfirm={handlePaymentConfirm}
      onCancel={() => (payingAppt = null)}
    />
  {/if}
</section>
