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

  /** Color decorativo por fila de servicio, cíclico -- solo estética, no codifica ningún dato. */
  const SERVICE_SWATCHES = ['#7fc8e8', '#f2a679', '#9ad9b0', '#e3c26b', '#c79bd6', '#e69aa8'];

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

<form class="appt-form" onsubmit={handleSubmit}>
  <div class="appt-form-banner">
    <h2>{$t('appt.form_title')}</h2>
  </div>

  <div class="appt-form-grid">
    <div class="appt-form-col">
      <div class="field">
        <label for="appt-customer">{$t('appt.customer_label')}</label>
        <select id="appt-customer" bind:value={customerId}>
          <option value="">{$t('appt.customer_walkin_opt')}</option>
          {#each customers as customer (customer.id)}
            <option value={customer.id}>{customer.name}</option>
          {/each}
        </select>
      </div>

      {#if isWalkin}
        <div class="field">
          <label for="appt-walkin-name">{$t('appt.walkin_name_label')}</label>
          <input id="appt-walkin-name" type="text" bind:value={walkinName} />
        </div>
      {/if}

      <fieldset class="services-box">
        <legend>{$t('appt.services_label')}</legend>
        {#if activeServices.length === 0}
          <p>{$t('appt.no_services')}</p>
        {:else}
          <div class="services-list">
            {#each activeServices as service, i (service.id)}
              <label class="service-row">
                <span class="service-swatch" style="background: {SERVICE_SWATCHES[i % SERVICE_SWATCHES.length]}" aria-hidden="true"
                ></span>
                <input
                  type="checkbox"
                  class="sr-only"
                  checked={selectedServiceIds.includes(service.id)}
                  onchange={(e) => toggleService(service.id, (e.currentTarget as HTMLInputElement).checked)}
                />
                <span class="service-row-label">{service.name} ({service.duration_minutes} min - ${Number(service.price).toFixed(2)})</span>
              </label>
            {/each}
          </div>
        {/if}
        {#if selectedServices.length > 0}
          <p class="services-summary">
            {$t('appt.services_info', { n: selectedServices.length, dur: totalDuration, price: `$${totalPrice.toFixed(2)}` })}
          </p>
        {/if}
      </fieldset>
    </div>

    <div class="appt-form-col">
      <div class="field field-icon">
        <label for="appt-specialist">{$t('appt.specialist_label')}</label>
        <div class="field-icon-wrap">
          <svg class="field-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
          </svg>
          <select id="appt-specialist" required bind:value={specialistId}>
            {#each specialistOptions as opt (opt.id)}
              <option value={opt.id}>{opt.label}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="field field-icon">
        <label for="appt-input-date">{$t('appt.date_field')}</label>
        <div class="field-icon-wrap">
          <svg class="field-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
            <path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
          </svg>
          <input id="appt-input-date" type="date" required bind:value={date} />
        </div>
      </div>

      <div class="field field-icon">
        <label for="appt-input-time">{$t('appt.time_field')}</label>
        <div class="field-icon-wrap">
          <svg class="field-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          <input id="appt-input-time" type="time" required bind:value={time} />
        </div>
      </div>

      <div class="field">
        <label for="appt-notes">{$t('appt.notes_label')}</label>
        <textarea id="appt-notes" bind:value={notes}></textarea>
      </div>
    </div>
  </div>

  {#if errorMessage}
    <p role="alert">{errorMessage}</p>
  {/if}

  <div class="appt-form-actions">
    <button type="submit" class="btn-primary-glow" disabled={submitting}>{$t('appt.save')}</button>
    <button type="button" class="btn-outline-glow" onclick={onCancel}>{$t('common.cancel')}</button>
  </div>
</form>

<style>
  /* Tema "premium" de Agenda (oscuro, dorado, acentos con brillo) --
     acotado a este formulario y al resto de la sección de Agenda, no al
     resto de la app. Los tokens se repiten igual en AgendaScreen.svelte
     porque cada componente Svelte tiene su propio <style> aislado. */
  .appt-form {
    --at-bg: #1c1c1e;
    --at-border: #35353a;
    --at-glow: #35c3f0;
    --at-gold: #d8b878;
    --at-input-bg: #17171a;
    --at-text: #f0ece4;
    --at-muted: #9b9994;
    --at-teal-1: #1f7a86;
    --at-teal-2: #0f3d44;

    background: linear-gradient(160deg, var(--at-bg), #151517);
    border-radius: 16px;
    border: 1px solid var(--at-border);
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .appt-form-banner {
    background: linear-gradient(90deg, #2a2a2e, #1c1c1e);
    border-bottom: 1px solid var(--at-border);
    padding: 1rem;
    text-align: center;
  }

  .appt-form-banner h2 {
    margin: 0;
    font-family: var(--font-grotesk);
    font-weight: 700;
    font-size: 1.05rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--at-gold);
  }

  .appt-form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin: 1.25rem;
    padding: 1.25rem;
    border: 1px solid var(--at-glow);
    border-radius: 14px;
    box-shadow: 0 0 18px rgba(53, 195, 240, 0.18);
  }

  @media (min-width: 720px) {
    .appt-form-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .appt-form-col {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .appt-form p {
    color: var(--at-text);
  }

  .field label {
    color: var(--at-muted);
    font-size: 0.78rem;
    margin-bottom: 0.3rem;
  }

  .field select,
  .field input,
  .field textarea {
    width: 100%;
    background: var(--at-input-bg);
    border: 1px solid var(--at-border);
    border-radius: 10px;
    color: var(--at-text);
    padding: 0.55rem 0.75rem;
  }

  .field-icon-wrap {
    position: relative;
  }

  .field-icon-wrap select,
  .field-icon-wrap input {
    padding-left: 2.25rem;
  }

  .field-icon-svg {
    position: absolute;
    left: 0.65rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.05rem;
    height: 1.05rem;
    color: var(--at-teal-1);
    pointer-events: none;
  }

  .services-box {
    border: 1px solid var(--at-border);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.02);
    margin: 0;
  }

  .services-box legend {
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    color: var(--at-muted);
    padding: 0 0.3rem;
  }

  .services-list {
    display: flex;
    flex-direction: column;
  }

  .service-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.4rem;
    border-bottom: 1px solid var(--at-border);
    cursor: pointer;
    border-radius: 8px;
  }

  .service-row:last-child {
    border-bottom: none;
  }

  .service-row:has(input:checked) {
    background: rgba(53, 195, 240, 0.1);
  }

  .service-row:focus-within {
    outline: 2px solid var(--at-glow);
    outline-offset: 2px;
  }

  .service-swatch {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .service-row-label {
    color: var(--at-text);
    font-size: 0.9rem;
  }

  .services-summary {
    color: var(--at-teal-1) !important;
    font-weight: 600;
    font-size: 0.85rem;
    margin: 0.6rem 0 0;
  }

  .appt-form-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    padding: 0 1.25rem 1.5rem;
  }

  .btn-primary-glow,
  .btn-outline-glow {
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .btn-primary-glow {
    border-radius: 999px;
    padding: 0.65rem 1.9rem;
    background: linear-gradient(180deg, var(--at-teal-1), var(--at-teal-2));
    border: 1px solid var(--at-glow);
    color: #eafcff;
    font-weight: 700;
    box-shadow: 0 0 12px rgba(53, 195, 240, 0.35);
  }

  .btn-outline-glow {
    border-radius: 999px;
    padding: 0.65rem 1.9rem;
    background: transparent;
    border: 1px solid var(--at-teal-1);
    color: #7fd6e0;
    font-weight: 600;
  }
</style>
