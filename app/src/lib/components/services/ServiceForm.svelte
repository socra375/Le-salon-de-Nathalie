<script lang="ts">
  import { untrack } from 'svelte';
  import { t } from '../../stores/locale';
  import { saveService, type SpecialistOption } from '../../actions/services';
  import type { Tables } from '../../types/database.types';

  interface Props {
    businessId: string;
    service: Tables<'services'> | null;
    selectedSpecialistIds: string[];
    specialistOptions: SpecialistOption[];
    onSaved: () => void;
    onCancel: () => void;
  }

  const { businessId, service, selectedSpecialistIds, specialistOptions, onSaved, onCancel }: Props = $props();

  // Semilla única al montar -- editar estos campos no debe reflejarse en
  // el prop `service`, y el prop no vuelve a cambiar bajo el mismo form
  // (ServicesScreen desmonta/remonta al cambiar de servicio a editar).
  let name = $state(untrack(() => service?.name ?? ''));
  let category = $state(untrack(() => service?.category ?? 'Cabello'));
  let duration = $state(untrack(() => String(service?.duration_minutes ?? 30)));
  let price = $state(untrack(() => (service ? String(service.price) : '')));
  let active = $state(untrack(() => service?.active ?? true));
  let specialistIds = $state<string[]>(untrack(() => [...selectedSpecialistIds]));
  let submitting = $state(false);
  let errorMessage = $state('');

  function toggleSpecialist(id: string, checked: boolean) {
    specialistIds = checked ? [...specialistIds, id] : specialistIds.filter((s) => s !== id);
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    errorMessage = '';
    const trimmedName = name.trim();
    submitting = true;
    try {
      await saveService(
        {
          id: service?.id ?? null,
          businessId,
          name: trimmedName,
          category,
          durationMinutes: parseInt(duration, 10),
          price: parseFloat(price),
          active,
          specialistIds,
        },
        service
          ? $t('act.service_edited', { name: trimmedName })
          : $t('act.service_created', { name: trimmedName })
      );
      onSaved();
    } catch (err) {
      errorMessage = $t('svc.error_save', { msg: err instanceof Error ? err.message : String(err) });
    } finally {
      submitting = false;
    }
  }
</script>

<form class="card" onsubmit={handleSubmit}>
  <h3>{service ? $t('svc.form_title_edit') : $t('svc.form_title_new')}</h3>

  <div>
    <label for="svc-name">{$t('svc.name_label')}</label>
    <input id="svc-name" type="text" required bind:value={name} />
  </div>

  <div>
    <label for="svc-category">{$t('svc.category_label')}</label>
    <select id="svc-category" bind:value={category}>
      <option value="Cabello">{$t('svc.cat_hair')}</option>
      <option value="Uñas">{$t('svc.cat_nails')}</option>
      <option value="Piel">{$t('svc.cat_skin')}</option>
      <option value="Barbería">{$t('svc.cat_barber')}</option>
      <option value="Spa">{$t('svc.cat_spa')}</option>
      <option value="Otro">{$t('svc.cat_other')}</option>
    </select>
  </div>

  <div>
    <label for="svc-duration">{$t('svc.duration_label')}</label>
    <input id="svc-duration" type="number" min="5" step="5" required bind:value={duration} />
  </div>

  <div>
    <label for="svc-price">{$t('svc.price_label')}</label>
    <input id="svc-price" type="number" step="0.01" required bind:value={price} />
  </div>

  <label>
    <span>{$t('svc.active_label')}</span>
    <input type="checkbox" bind:checked={active} />
  </label>

  <fieldset>
    <legend>{$t('svc.specialists_label')}</legend>
    <div id="svc-specialists-checklist">
      {#each specialistOptions as opt (opt.id)}
        <label>
          <input
            type="checkbox"
            checked={specialistIds.includes(opt.id)}
            onchange={(e) => toggleSpecialist(opt.id, (e.currentTarget as HTMLInputElement).checked)}
          />
          {opt.label}
        </label>
      {/each}
    </div>
  </fieldset>

  {#if errorMessage}
    <p role="alert">{errorMessage}</p>
  {/if}

  <button type="submit" disabled={submitting}>{$t('svc.save')}</button>
  <button type="button" onclick={onCancel}>{$t('common.cancel')}</button>
</form>
