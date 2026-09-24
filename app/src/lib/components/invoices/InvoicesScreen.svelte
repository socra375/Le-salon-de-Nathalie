<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t, locale } from '../../stores/locale';
  import { currentBusinessId, currentBusiness } from '../../stores/session';
  import { invoices as invoicesStore } from '../../stores/invoices';
  import { appointments as appointmentsStore } from '../../stores/appointments';
  import { services as servicesStore } from '../../stores/services';
  import { customers as customersStore } from '../../stores/customers';
  import { loadInvoices } from '../../actions/invoices';
  import { loadServices, loadSpecialistOptions, type SpecialistOption } from '../../actions/services';
  import { loadAppointments } from '../../actions/appointments';
  import { loadCustomers } from '../../actions/customers';
  import { apptServices } from '../../utils/appointments';
  import { paymentMethodLabel } from '../../utils/payments';
  import { fmtDate } from '../../utils/format';
  import { buildInvoicePdf, openInvoicePdf, loadImageAsDataURL } from '../../pdf/invoicePdf';
  import type { Tables } from '../../types/database.types';

  let businessId = $state<string | null>(null);
  let specialistOptions = $state<SpecialistOption[]>([]);

  onMount(() => {
    businessId = get(currentBusinessId);
    if (!businessId) return;
    void loadInvoices(businessId);
    void loadAppointments(businessId);
    void loadServices(businessId);
    void loadCustomers(businessId);
    void loadSpecialistOptions(businessId, $t('appt.you_admin'), $t('appt.employee_unnamed')).then((options) => {
      specialistOptions = options;
    });
  });

  /** Reabre el PDF de una factura ya generada -- mismo dibujo que al facturar por primera vez. */
  async function viewInvoice(invoice: Tables<'invoices'>) {
    const appt = $appointmentsStore.find((a) => a.id === invoice.appointment_id) ?? null;
    const resolvedServices = appt ? apptServices(appt, $servicesStore) : [];
    const customer = $customersStore.find((c) => c.id === invoice.customer_id) ?? null;
    const specialistLabel = appt ? (specialistOptions.find((o) => o.id === appt.employee_id)?.label ?? null) : null;
    const business = $currentBusiness;
    const logo = business?.logo_url ? await loadImageAsDataURL(business.logo_url) : null;

    const doc = buildInvoicePdf({
      invoice,
      apptServices: resolvedServices,
      customer,
      business,
      specialistLabel,
      locale: $locale,
      logo,
    });
    openInvoicePdf(doc);
  }
</script>

<section aria-labelledby="invoices-title">
  <h1 id="invoices-title">{$t('inv.title')}</h1>
  <p>{$t('inv.auto_hint')}</p>

  <div class="card table-responsive">
    <h2>{$t('inv.history_title')}</h2>
    <table>
      <thead>
        <tr>
          <th>{$t('inv.th_number')}</th>
          <th>{$t('inv.th_date')}</th>
          <th>{$t('inv.th_payment')}</th>
          <th>{$t('inv.th_total')}</th>
          <th>{$t('inv.th_action')}</th>
        </tr>
      </thead>
      <tbody>
        {#each $invoicesStore as invoice (invoice.id)}
          <tr>
            <td>{invoice.invoice_number}</td>
            <td>{invoice.created_at ? fmtDate(invoice.created_at, $locale) : ''}</td>
            <td>{paymentMethodLabel(invoice.payment_method ?? '', $locale)}</td>
            <td>${Number(invoice.total).toFixed(2)}</td>
            <td><button type="button" onclick={() => viewInvoice(invoice)}>{$t('inv.view')}</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
