<script lang="ts">
  import { untrack } from 'svelte';
  import { t, locale as localeStore } from '../../stores/locale';
  import { updateBusinessLanguage } from '../../actions/settings';
  import { LOCALES, type Locale } from '../../i18n';

  interface Props {
    businessId: string;
    business: import('../../types/database.types').Tables<'businesses'> | null;
  }

  const { businessId, business }: Props = $props();

  const LANGUAGE_LABELS: Record<Locale, string> = {
    es: 'Español',
    en: 'English',
    fr: 'Français',
    pt: 'Português',
    de: 'Deutsch',
    it: 'Italiano',
  };

  let selected = $state<Locale>(untrack(() => (business?.language as Locale | null) ?? $localeStore));
  let submitting = $state(false);
  let statusMessage = $state<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    statusMessage = null;
    submitting = true;
    try {
      await updateBusinessLanguage(businessId, selected);
      statusMessage = { kind: 'success', text: $t('cfg.language_saved') };
    } catch (err) {
      statusMessage = { kind: 'error', text: $t('cfg.error_generic', { msg: err instanceof Error ? err.message : String(err) }) };
    } finally {
      submitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <div>
    <label for="cfg-language">{$t('cfg.language_label')}</label>
    <select id="cfg-language" bind:value={selected}>
      {#each LOCALES as loc (loc)}
        <option value={loc}>{LANGUAGE_LABELS[loc]}</option>
      {/each}
    </select>
  </div>

  {#if statusMessage}
    <p role={statusMessage.kind === 'error' ? 'alert' : 'status'}>{statusMessage.text}</p>
  {/if}

  <button type="submit" disabled={submitting}>{$t('cfg.save_language')}</button>
</form>
