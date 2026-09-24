<script lang="ts">
  import { t } from '../../stores/locale';
  import { currentBusinessId, currentBusiness } from '../../stores/session';
  import type { TranslationKey } from '../../i18n';
  import AccountTab from './AccountTab.svelte';
  import PlanTab from './PlanTab.svelte';
  import BusinessTab from './BusinessTab.svelte';
  import LanguageTab from './LanguageTab.svelte';
  import AppearanceTab from './AppearanceTab.svelte';
  import TaxTab from './TaxTab.svelte';
  import PaymentsTab from './PaymentsTab.svelte';
  import ActivityLogTab from './ActivityLogTab.svelte';

  type TabKey = 'account' | 'plan' | 'business' | 'language' | 'appearance' | 'tax' | 'payments' | 'activity';

  const TABS: { key: TabKey; labelKey: TranslationKey; icon: string; color: string }[] = [
    { key: 'account', labelKey: 'cfg.tab_account', icon: '👤', color: '#8e8e93' },
    { key: 'plan', labelKey: 'cfg.tab_plan', icon: '💬', color: '#25d366' },
    { key: 'business', labelKey: 'cfg.tab_business', icon: '🏢', color: '#64d2ff' },
    { key: 'language', labelKey: 'cfg.tab_language', icon: '🌐', color: '#0a84ff' },
    { key: 'appearance', labelKey: 'cfg.tab_appearance', icon: '🎨', color: '#ff9f0a' },
    { key: 'tax', labelKey: 'cfg.tab_tax', icon: '💵', color: '#30d158' },
    { key: 'payments', labelKey: 'cfg.tab_payments', icon: '💳', color: '#bf5af2' },
    { key: 'activity', labelKey: 'cfg.tab_activity', icon: '📋', color: '#8e8e93' },
  ];

  let activeTab = $state<TabKey | null>(null);
</script>

<section aria-labelledby="settings-title">
  <h1 id="settings-title">{$t('cfg.title')}</h1>
  <p>{$t('cfg.subtitle')}</p>

  {#if $currentBusinessId}
    {#if activeTab === null}
      <div class="settings-list">
        {#each TABS as tab (tab.key)}
          <button type="button" class="settings-row" onclick={() => (activeTab = tab.key)}>
            <span class="settings-icon" style="background: {tab.color}" aria-hidden="true">{tab.icon}</span>
            <span class="settings-row-label">{$t(tab.labelKey)}</span>
            <span class="settings-chevron" aria-hidden="true">›</span>
          </button>
        {/each}
      </div>
    {:else}
      <button type="button" class="btn-settings-back" onclick={() => (activeTab = null)}>
        ‹ {$t('cfg.back')}
      </button>

      {#if activeTab === 'account'}
        <AccountTab />
      {:else if activeTab === 'plan'}
        <PlanTab />
      {:else if activeTab === 'business'}
        <BusinessTab businessId={$currentBusinessId} business={$currentBusiness} />
      {:else if activeTab === 'language'}
        <LanguageTab businessId={$currentBusinessId} business={$currentBusiness} />
      {:else if activeTab === 'appearance'}
        <AppearanceTab businessId={$currentBusinessId} business={$currentBusiness} />
      {:else if activeTab === 'tax'}
        <TaxTab businessId={$currentBusinessId} business={$currentBusiness} />
      {:else if activeTab === 'payments'}
        <PaymentsTab businessId={$currentBusinessId} business={$currentBusiness} />
      {:else if activeTab === 'activity'}
        <ActivityLogTab businessId={$currentBusinessId} />
      {/if}
    {/if}
  {/if}
</section>
