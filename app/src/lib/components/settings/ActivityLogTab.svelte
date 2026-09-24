<script lang="ts">
  import { onMount } from 'svelte';
  import { t, locale } from '../../stores/locale';
  import { loadActivityLog } from '../../actions/activityLog';
  import { fmtDateTime } from '../../utils/format';
  import type { Tables } from '../../types/database.types';

  interface Props {
    businessId: string;
  }

  const { businessId }: Props = $props();

  let entries = $state<Tables<'activity_log'>[]>([]);

  onMount(() => {
    void loadActivityLog(businessId).then((list) => {
      entries = list;
    });
  });
</script>

<div class="table-responsive">
  <table>
    <thead>
      <tr>
        <th>{$t('cfg.activity_th_user')}</th>
        <th>{$t('cfg.activity_th_action')}</th>
        <th>{$t('cfg.activity_th_date')}</th>
      </tr>
    </thead>
    <tbody>
      {#each entries as entry (entry.id)}
        <tr>
          <td>{entry.user_id ? entry.user_id.substring(0, 8) : $t('common.system')}</td>
          <td>{entry.action}</td>
          <td>{entry.created_at ? fmtDateTime(entry.created_at, $locale) : ''}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
