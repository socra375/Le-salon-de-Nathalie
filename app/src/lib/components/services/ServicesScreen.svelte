<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t } from '../../stores/locale';
  import { currentBusinessId } from '../../stores/session';
  import { services as servicesStore, specialistServices as specialistServicesStore } from '../../stores/services';
  import { loadServices, loadSpecialistOptions, removeService, type SpecialistOption } from '../../actions/services';
  import ServiceForm from './ServiceForm.svelte';
  import type { Tables } from '../../types/database.types';

  let businessId = $state<string | null>(null);
  let formOpen = $state(false);
  let editingService = $state<Tables<'services'> | null>(null);
  let specialistOptions = $state<SpecialistOption[]>([]);
  let confirmingDeleteId = $state<string | null>(null);
  let deleteError = $state('');

  onMount(() => {
    businessId = get(currentBusinessId);
    if (businessId) void refresh(businessId);
  });

  async function refresh(id: string) {
    const [, options] = await Promise.all([
      loadServices(id),
      loadSpecialistOptions(id, $t('appt.you_admin'), $t('appt.employee_unnamed')),
    ]);
    specialistOptions = options;
  }

  function selectedSpecialistIdsFor(serviceId: string): string[] {
    return get(specialistServicesStore)
      .filter((link) => link.service_id === serviceId)
      .map((link) => link.employee_id);
  }

  function openNewForm() {
    editingService = null;
    formOpen = true;
  }

  function openEditForm(service: Tables<'services'>) {
    editingService = service;
    formOpen = true;
  }

  function closeForm() {
    formOpen = false;
    editingService = null;
  }

  async function confirmDelete(service: Tables<'services'>) {
    if (!businessId) return;
    deleteError = '';
    const result = await removeService(businessId, service.id, $t('act.service_deleted', { name: service.name }));
    if (result.status === 'blocked') {
      deleteError = $t('svc.delete_blocked', { name: service.name });
    } else if (result.status === 'error') {
      deleteError = $t('svc.error_delete', { msg: result.message });
    }
    confirmingDeleteId = null;
  }
</script>

<section aria-labelledby="services-title">
  <h1 id="services-title">{$t('cfg.tab_services')}</h1>
  <p>{$t('svc.subtitle')}</p>

  {#if !formOpen}
    <button type="button" onclick={openNewForm}>{$t('svc.new_btn')}</button>
  {/if}

  {#if formOpen && businessId}
    <ServiceForm
      {businessId}
      service={editingService}
      selectedSpecialistIds={editingService ? selectedSpecialistIdsFor(editingService.id) : []}
      {specialistOptions}
      onSaved={closeForm}
      onCancel={closeForm}
    />
  {/if}

  {#if deleteError}
    <p role="alert">{deleteError}</p>
  {/if}

  <div class="table-responsive">
    <table>
      <thead>
        <tr>
          <th>{$t('svc.th_service')}</th>
          <th>{$t('svc.th_category')}</th>
          <th>{$t('svc.th_duration')}</th>
          <th>{$t('svc.th_price')}</th>
          <th>{$t('svc.th_status')}</th>
          <th>{$t('svc.th_action')}</th>
        </tr>
      </thead>
      <tbody>
        {#each $servicesStore as service (service.id)}
          <tr>
            <td>{service.name}</td>
            <td>{service.category || 'N/A'}</td>
            <td>{service.duration_minutes} min</td>
            <td>${Number(service.price).toFixed(2)}</td>
            <td>{service.active ? $t('svc.status_active') : $t('svc.status_inactive')}</td>
            <td>
              {#if confirmingDeleteId === service.id}
                <span role="alertdialog" aria-label={$t('svc.confirm_delete', { name: service.name })}>
                  {$t('svc.confirm_delete', { name: service.name })}
                  <button type="button" onclick={() => confirmDelete(service)}>{$t('common.delete')}</button>
                  <button type="button" onclick={() => (confirmingDeleteId = null)}>{$t('common.cancel')}</button>
                </span>
              {:else}
                <button type="button" onclick={() => openEditForm(service)}>{$t('common.edit')}</button>
                <button type="button" onclick={() => (confirmingDeleteId = service.id)}>{$t('common.delete')}</button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
