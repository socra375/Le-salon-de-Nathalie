<script lang="ts">
  import { untrack } from 'svelte';
  import { t } from '../../stores/locale';
  import { updateBusinessTax } from '../../actions/settings';
  import type { Tables } from '../../types/database.types';

  interface Props {
    businessId: string;
    business: Tables<'businesses'> | null;
  }

  const { businessId, business }: Props = $props();

  const CURRENCIES = ['$', 'RD$', '€', 'MXN$', 'CA$'];

  let currencySymbol = $state(untrack(() => business?.currency_symbol ?? '$'));
  let taxEnabled = $state(untrack(() => business?.tax_enabled ?? false));
  let taxPercentage = $state(untrack(() => String(business?.tax_percentage ?? 0)));
  let taxIncludedInPrice = $state(untrack(() => business?.tax_included_in_price ?? true));
  let submitting = $state(false);
  let statusMessage = $state<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    statusMessage = null;
    submitting = true;
    try {
      await updateBusinessTax(
        {
          businessId,
          currencySymbol,
          taxEnabled,
          taxPercentage: parseFloat(taxPercentage) || 0,
          taxIncludedInPrice,
        },
        $t('act.tax_updated')
      );
      statusMessage = { kind: 'success', text: $t('cfg.tax_saved') };
    } catch (err) {
      statusMessage = { kind: 'error', text: $t('cfg.error_generic', { msg: err instanceof Error ? err.message : String(err) }) };
    } finally {
      submitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <div>
    <label for="cfg-currency-symbol">{$t('cfg.currency_label')}</label>
    <select id="cfg-currency-symbol" bind:value={currencySymbol}>
      {#each CURRENCIES as symbol (symbol)}
        <option value={symbol}>{symbol}</option>
      {/each}
    </select>
  </div>

  <label>
    <input type="checkbox" bind:checked={taxEnabled} />
    {$t('cfg.tax_enabled_label')}
  </label>

  {#if taxEnabled}
    <div>
      <label for="cfg-tax-percentage">{$t('cfg.tax_pct_label')}</label>
      <input id="cfg-tax-percentage" type="number" step="0.01" bind:value={taxPercentage} />
    </div>

    <fieldset>
      <legend>{$t('cfg.tax_mode_label')}</legend>
      <label>
        <input type="radio" name="tax-mode" value={true} bind:group={taxIncludedInPrice} />
        {$t('cfg.tax_mode_included')}
      </label>
      <label>
        <input type="radio" name="tax-mode" value={false} bind:group={taxIncludedInPrice} />
        {$t('cfg.tax_mode_added')}
      </label>
    </fieldset>
  {/if}

  {#if statusMessage}
    <p role={statusMessage.kind === 'error' ? 'alert' : 'status'}>{statusMessage.text}</p>
  {/if}

  <button type="submit" disabled={submitting}>{$t('cfg.save_tax')}</button>
</form>
