<script lang="ts">
  import { t } from '../../stores/locale';
  import { currentBusinessId, currentBusiness } from '../../stores/session';
  import type { TranslationKey } from '../../i18n';
  import AccountTab from './AccountTab.svelte';
  import BusinessTab from './BusinessTab.svelte';
  import LanguageTab from './LanguageTab.svelte';
  import AppearanceTab from './AppearanceTab.svelte';
  import TaxTab from './TaxTab.svelte';
  import PaymentsTab from './PaymentsTab.svelte';
  import ActivityLogTab from './ActivityLogTab.svelte';

  type TabKey = 'account' | 'business' | 'language' | 'appearance' | 'tax' | 'payments' | 'activity';

  const TABS: { key: TabKey; labelKey: TranslationKey }[] = [
    { key: 'account', labelKey: 'cfg.tab_account' },
    { key: 'business', labelKey: 'cfg.tab_business' },
    { key: 'language', labelKey: 'cfg.tab_language' },
    { key: 'appearance', labelKey: 'cfg.tab_appearance' },
    { key: 'tax', labelKey: 'cfg.tab_tax' },
    { key: 'payments', labelKey: 'cfg.tab_payments' },
    { key: 'activity', labelKey: 'cfg.tab_activity' },
  ];

  let activeTab = $state<TabKey>('account');
</script>

<section aria-labelledby="settings-title">
  <h1 id="settings-title">{$t('cfg.title')}</h1>
  <p>{$t('cfg.subtitle')}</p>

  <nav aria-label={$t('cfg.title')}>
    {#each TABS as tab (tab.key)}
      <button type="button" aria-pressed={activeTab === tab.key} onclick={() => (activeTab = tab.key)}>
        {$t(tab.labelKey)}
      </button>
    {/each}
  </nav>

  {#if $currentBusinessId}
    {#if activeTab === 'account'}
      <AccountTab />
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
</section>
