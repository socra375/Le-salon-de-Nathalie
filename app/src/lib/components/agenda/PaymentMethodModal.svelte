<script lang="ts">
  import { untrack } from 'svelte';
  import { t } from '../../stores/locale';
  import { linkAppointmentCustomer } from '../../actions/appointments';
  import { enabledPaymentMethods, type PaymentMethodKey } from '../../utils/payments';
  import { apptServicesLabel, appointmentRevenue } from '../../utils/appointments';
  import Modal from '../shared/Modal.svelte';
  import type { Tables } from '../../types/database.types';

  interface Props {
    appt: Tables<'appointments'>;
    clientName: string;
    services: Tables<'services'>[];
    customers: Tables<'customers'>[];
    business: Tables<'businesses'> | null;
    onConfirm: (paymentMethod: PaymentMethodKey) => void;
    onCancel: () => void;
  }

  const { appt, clientName, services, customers, business, onConfirm, onCancel }: Props = $props();

  const methods = $derived(
    enabledPaymentMethods(business?.payment_methods as Partial<Record<PaymentMethodKey, boolean>> | null | undefined)
  );
  const canLinkCustomer = $derived(!appt.customer_id);
  const sortedCustomers = $derived([...customers].sort((a, b) => a.name.localeCompare(b.name)));
  const curr = $derived(business?.currency_symbol || '$');

  // Semilla única al montar -- no reactiva a cambios posteriores de `methods`.
  let selectedMethod = $state<PaymentMethodKey | ''>(untrack(() => methods[0]?.key ?? ''));
  let linkedCustomerId = $state('');
  let errorMessage = $state('');
  let submitting = $state(false);

  const needsCustomerLink = $derived(canLinkCustomer && selectedMethod === 'credito');

  async function handleConfirm(event: SubmitEvent) {
    event.preventDefault();
    errorMessage = '';

    if (!selectedMethod) {
      errorMessage = $t('pay.select_required');
      return;
    }

    if (needsCustomerLink) {
      if (!linkedCustomerId) {
        errorMessage = $t('pay.credit_needs_customer');
        return;
      }
      // Enlaza la cita al cliente elegido de forma permanente -- igual que
      // el legado, para que quede registrada en su historial de ahí en más.
      submitting = true;
      try {
        await linkAppointmentCustomer(appt.id, linkedCustomerId);
      } finally {
        submitting = false;
      }
    }

    onConfirm(selectedMethod);
  }
</script>

<Modal labelledBy="pay-title" onClose={onCancel}>
  <div class="card">
  <h2 id="pay-title">{$t('pay.title')}</h2>
  <p>{$t('pay.body')}</p>

  <form onsubmit={handleConfirm}>
    <fieldset>
      <legend>{$t('pay.title')}</legend>
      {#each methods as method (method.key)}
        <label>
          <input type="radio" name="pay-method" value={method.key} bind:group={selectedMethod} />
          {$t(method.i18n)}
        </label>
      {/each}
    </fieldset>

    <p>
      {$t('pay.summary', {
        client: clientName,
        services: apptServicesLabel(appt, services),
        total: `${curr}${appointmentRevenue(appt, services).toFixed(2)}`,
      })}
    </p>

    {#if needsCustomerLink}
      <div>
        <label for="pay-credit-customer-select">{$t('pay.credit_link_label')}</label>
        <select id="pay-credit-customer-select" bind:value={linkedCustomerId}>
          <option value="">{$t('pay.credit_link_placeholder')}</option>
          {#each sortedCustomers as customer (customer.id)}
            <option value={customer.id}>{customer.name}</option>
          {/each}
        </select>
      </div>
    {/if}

    {#if errorMessage}
      <p role="alert">{errorMessage}</p>
    {/if}

    <button type="submit" disabled={submitting}>{$t('pay.confirm')}</button>
    <button type="button" onclick={onCancel}>{$t('common.cancel')}</button>
  </form>
  </div>
</Modal>
