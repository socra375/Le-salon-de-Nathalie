<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t, locale } from '../../stores/locale';
  import { currentBusinessId } from '../../stores/session';
  import { employees as employeesStore } from '../../stores/employees';
  import { loadEmployees, generateInvite, updateEmployeeRoleTitle } from '../../actions/employees';
  import { fmtDate } from '../../utils/format';
  import type { Tables } from '../../types/database.types';

  let businessId = $state<string | null>(null);
  let generatedCode = $state('');
  let generating = $state(false);
  let errorMessage = $state('');
  let copyMessage = $state('');

  onMount(() => {
    businessId = get(currentBusinessId);
    if (businessId) void loadEmployees(businessId);
  });

  async function handleGenerate() {
    if (!businessId) return;
    errorMessage = '';
    copyMessage = '';
    generating = true;
    try {
      generatedCode = await generateInvite(businessId, $t('act.invite_generated'));
    } catch (err) {
      errorMessage = $t('emp.error_generate_code', { msg: err instanceof Error ? err.message : String(err) });
    } finally {
      generating = false;
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedCode);
    copyMessage = $t('emp.copied');
  }

  async function handleRoleTitleChange(member: Tables<'business_members'>, value: string) {
    if (!businessId) return;
    await updateEmployeeRoleTitle(businessId, member.id, value, $t('act.role_updated', { title: value }));
  }
</script>

<section aria-labelledby="employees-title">
  <h1 id="employees-title">{$t('emp.title')}</h1>

  <div class="card">
    <h3>{$t('emp.invite_title')}</h3>
    <p>{$t('emp.invite_hint')}</p>
    <button type="button" disabled={generating} onclick={handleGenerate}>{$t('emp.generate_code')}</button>

    {#if errorMessage}
      <p role="alert">{errorMessage}</p>
    {/if}

    {#if generatedCode}
      <div>
        <span>{$t('emp.code_generated')}</span>
        <h2>{generatedCode}</h2>
        <button type="button" onclick={handleCopy}>{$t('emp.copy_code')}</button>
        <p>{$t('emp.code_expiry_hint')}</p>
        {#if copyMessage}
          <p role="status">{copyMessage}</p>
        {/if}
      </div>
    {/if}
  </div>

  <div class="card table-responsive">
    <h3>{$t('emp.list_title')}</h3>
    <table>
      <thead>
        <tr>
          <th>{$t('emp.th_name')}</th>
          <th>{$t('emp.th_position')}</th>
          <th>{$t('emp.th_role')}</th>
          <th>{$t('emp.th_added')}</th>
        </tr>
      </thead>
      <tbody>
        {#each $employeesStore as member (member.id)}
          <tr>
            <td>{member.employee_name || $t('emp.no_name')}</td>
            <td>
              <label class="sr-only" for={`emp-role-title-${member.id}`}>{$t('emp.th_position')}</label>
              <input
                id={`emp-role-title-${member.id}`}
                type="text"
                value={member.role_title || ''}
                placeholder={$t('emp.position_placeholder')}
                onchange={(e) => handleRoleTitleChange(member, (e.currentTarget as HTMLInputElement).value)}
              />
            </td>
            <td>{$t('emp.role_employee')}</td>
            <td>{member.created_at ? fmtDate(member.created_at, $locale) : ''}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
