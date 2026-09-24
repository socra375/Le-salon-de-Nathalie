<script lang="ts">
  import { t } from '../../stores/locale';
  import { updateBusinessAppearance, clearBusinessBackground } from '../../actions/settings';
  import type { Tables } from '../../types/database.types';

  interface Props {
    businessId: string;
    business: Tables<'businesses'> | null;
  }

  const { businessId, business }: Props = $props();

  let backgroundFile = $state<File | null>(null);
  let submitting = $state(false);
  let statusMessage = $state<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    statusMessage = null;
    submitting = true;
    try {
      await updateBusinessAppearance(
        { businessId, backgroundFile, currentBackgroundUrl: business?.background_url ?? null },
        $t('act.appearance_updated')
      );
      statusMessage = { kind: 'success', text: $t('cfg.appearance_saved') };
      backgroundFile = null;
    } catch (err) {
      statusMessage = {
        kind: 'error',
        text: $t('cfg.background_upload_error', { msg: err instanceof Error ? err.message : String(err) }),
      };
    } finally {
      submitting = false;
    }
  }

  async function handleClear() {
    statusMessage = null;
    try {
      await clearBusinessBackground(businessId, $t('act.appearance_updated'));
    } catch (err) {
      statusMessage = { kind: 'error', text: $t('cfg.error_generic', { msg: err instanceof Error ? err.message : String(err) }) };
    }
  }
</script>

<p>{$t('cfg.theme_hint')}</p>

<form onsubmit={handleSubmit}>
  <div>
    <label for="cfg-background-file">{$t('cfg.background_label')}</label>
    {#if business?.background_url}
      <img src={business.background_url} alt="" />
    {/if}
    <input
      id="cfg-background-file"
      type="file"
      accept="image/*"
      onchange={(e) => (backgroundFile = (e.currentTarget as HTMLInputElement).files?.[0] ?? null)}
    />
    <button type="button" onclick={handleClear}>{$t('cfg.background_clear')}</button>
  </div>

  {#if statusMessage}
    <p role={statusMessage.kind === 'error' ? 'alert' : 'status'}>{statusMessage.text}</p>
  {/if}

  <button type="submit" disabled={submitting}>{$t('cfg.save_appearance')}</button>
</form>
