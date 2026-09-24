<script lang="ts">
  import { untrack } from 'svelte';
  import { t } from '../../stores/locale';
  import { updateBusinessInfo, clearBusinessLogo } from '../../actions/settings';
  import type { Tables } from '../../types/database.types';

  interface Props {
    businessId: string;
    business: Tables<'businesses'> | null;
  }

  const { businessId, business }: Props = $props();

  let name = $state(untrack(() => business?.name ?? ''));
  let phone = $state(untrack(() => business?.phone ?? ''));
  let address = $state(untrack(() => business?.address ?? ''));
  let website = $state(untrack(() => business?.website ?? ''));
  let logoFile = $state<File | null>(null);
  let submitting = $state(false);
  let statusMessage = $state<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    statusMessage = null;
    submitting = true;
    try {
      const result = await updateBusinessInfo(
        { businessId, name, phone, address, website, logoFile, currentLogoUrl: business?.logo_url ?? null },
        $t('act.business_updated')
      );
      statusMessage = result.logoUploadError
        ? { kind: 'error', text: $t('cfg.logo_upload_error', { msg: result.logoUploadError }) }
        : { kind: 'success', text: $t('cfg.business_saved') };
    } catch (err) {
      statusMessage = { kind: 'error', text: $t('cfg.error_generic', { msg: err instanceof Error ? err.message : String(err) }) };
    } finally {
      submitting = false;
    }
  }

  async function handleClearLogo() {
    statusMessage = null;
    try {
      await clearBusinessLogo(businessId, $t('act.business_updated'));
    } catch (err) {
      statusMessage = { kind: 'error', text: $t('cfg.error_generic', { msg: err instanceof Error ? err.message : String(err) }) };
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <div>
    <label for="cfg-name">{$t('cfg.business_name_label')}</label>
    <input id="cfg-name" type="text" required bind:value={name} />
  </div>

  <div>
    <label for="cfg-phone">{$t('cfg.phone_label')}</label>
    <input id="cfg-phone" type="tel" bind:value={phone} />
  </div>

  <div>
    <label for="cfg-address">{$t('cfg.address_label')}</label>
    <input id="cfg-address" type="text" bind:value={address} />
  </div>

  <div>
    <label for="cfg-website">{$t('cfg.website_label')}</label>
    <input id="cfg-website" type="text" bind:value={website} />
  </div>

  <div>
    <label for="cfg-logo-file">{$t('cfg.logo_label')}</label>
    {#if business?.logo_url}
      <img src={business.logo_url} alt="" />
    {/if}
    <input
      id="cfg-logo-file"
      type="file"
      accept="image/*"
      onchange={(e) => (logoFile = (e.currentTarget as HTMLInputElement).files?.[0] ?? null)}
    />
    <button type="button" onclick={handleClearLogo}>{$t('cfg.logo_clear')}</button>
  </div>

  {#if statusMessage}
    <p role={statusMessage.kind === 'error' ? 'alert' : 'status'}>{statusMessage.text}</p>
  {/if}

  <button type="submit" disabled={submitting}>{$t('cfg.save_business')}</button>
</form>
