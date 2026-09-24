<script lang="ts">
  import { untrack } from 'svelte';
  import { t, locale } from '../../stores/locale';
  import { createAppointment } from '../../actions/appointments';
  import { fmtDateTime } from '../../utils/format';
  import type { SpecialistOption } from '../../actions/services';
  import type { Tables } from '../../types/database.types';

  interface Props {
    businessId: string;
    services: Tables<'services'>[];
    specialistOptions: SpecialistOption[];
    customers: Tables<'customers'>[];
    initialDate: string;
    onSaved: () => void;
    onCancel: () => void;
  }

  const { businessId, services, specialistOptions, customers, initialDate, onSaved, onCancel }: Props = $props();

  const activeServices = $derived(services.filter((s) => s.active));

  let customerId = $state('');
  let walkinName = $state('');
  let selectedServiceIds = $state<string[]>([]);
  // Semilla única al montar -- no reactiva a cambios posteriores del prop
  // (mismo criterio que AuthScreen con `pendingInvite`).
  let specialistId = $state(untrack(() => specialistOptions[0]?.id ?? ''));
  let date = $state(untrack(() => initialDate));
  let time = $state('');
  let notes = $state('');
  let submitting = $state(false);
  let errorMessage = $state('');

  const isWalkin = $derived(customerId === '');
  const selectedServices = $derived(
    selectedServiceIds.map((id) => activeServices.find((s) => s.id === id)).filter((s): s is Tables<'services'> => Boolean(s))
  );
  const totalDuration = $derived(selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 0), 0));
  const totalPrice = $derived(selectedServices.reduce((acc, s) => acc + Number(s.price || 0), 0));

  function toggleService(id: string, checked: boolean) {
    selectedServiceIds = checked ? [...selectedServiceIds, id] : selectedServiceIds.filter((s) => s !== id);
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    errorMessage = '';

    if (selectedServices.length === 0) {
      errorMessage = $t('appt.select_valid_service');
      return;
    }
    if (!specialistId) {
      errorMessage = $t('appt.select_specialist');
      return;
    }
    const startAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startAt.getTime())) {
      errorMessage = $t('appt.invalid_datetime');
      return;
    }

    submitting = true;
    try {
      const serviceNames = selectedServices.map((s) => s.name).join(' + ');
      await createAppointment(
        {
          businessId,
          customerId: customerId || null,
          walkinName,
          specialistId,
          serviceIds: selectedServiceIds,
          services: activeServices,
          startAt,
          notes,
        },
        $t('act.appt_created', { service: serviceNames, when: fmtDateTime(startAt, $locale) })
      );
      onSaved();
    } catch (err) {
      errorMessage = $t('appt.error_create', { msg: err instanceof Error ? err.message : String(err) });
    } finally {
      submitting = false;
    }
  }
</script>

<form class="card" onsubmit={handleSubmit}>
  <h3>{$t('appt.form_title')}</h3>

  <div>
    <label for="appt-customer">{$t('appt.customer_label')}</label>
    <select id="appt-customer" bind:value={customerId}>
      <option value="">{$t('appt.customer_walkin_opt')}</option>
      {#each customers as customer (customer.id)}
        <option value={customer.id}>{customer.name}</option>
      {/each}
    </select>
  </div>

  {#if isWalkin}
    <div>
      <label for="appt-walkin-name">{$t('appt.walkin_name_label')}</label>
      <input id="appt-walkin-name" type="text" bind:value={walkinName} />
    </div>
  {/if}

  <fieldset>
    <legend>{$t('appt.services_label')}</legend>
    {#if activeServices.length === 0}
      <p>{$t('appt.no_services')}</p>
    {:else}
      {#each activeServices as service (service.id)}
        <label>
          <input
            type="checkbox"
            checked={selectedServiceIds.includes(service.id)}
            onchange={(e) => toggleService(service.id, (e.currentTarget as HTMLInputElement).checked)}
          />
          {service.name} ({service.duration_minutes} min - ${Number(service.price).toFixed(2)})
        </label>
      {/each}
    {/if}
    {#if selectedServices.length > 0}
      <p>{$t('appt.services_info', { n: selectedServices.length, dur: totalDuration, price: `$${totalPrice.toFixed(2)}` })}</p>
    {/if}
  </fieldset>

  <div>
    <label for="appt-specialist">{$t('appt.specialist_label')}</label>
    <select id="appt-specialist" required bind:value={specialistId}>
      {#each specialistOptions as opt (opt.id)}
        <option value={opt.id}>{opt.label}</option>
      {/each}
    </select>
  </div>

  <div>
    <label for="appt-input-date">{$t('appt.date_field')}</label>
    <input id="appt-input-date" type="date" required bind:value={date} />
  </div>

  <div>
    <label for="appt-input-time">{$t('appt.time_field')}</label>
    <input id="appt-input-time" type="time" required bind:value={time} />
  </div>

  <div>
    <label for="appt-notes">{$t('appt.notes_label')}</label>
    <textarea id="appt-notes" bind:value={notes}></textarea>
  </div>

  {#if errorMessage}
    <p role="alert">{errorMessage}</p>
  {/if}

  <button type="submit" disabled={submitting}>{$t('appt.save')}</button>
  <button type="button" onclick={onCancel}>{$t('common.cancel')}</button>
</form>
