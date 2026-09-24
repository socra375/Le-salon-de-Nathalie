<script lang="ts">
  import { untrack } from 'svelte';
  import { t } from '../../stores/locale';
  import { updateBusinessPaymentMethods, type BusinessPaymentMethodsConfig } from '../../actions/settings';
  import type { Tables } from '../../types/database.types';

  interface Props {
    businessId: string;
    business: Tables<'businesses'> | null;
  }

  const { businessId, business }: Props = $props();

  function initial(key: string): boolean {
    const pm = business?.payment_methods as Record<string, boolean> | null | undefined;
    return pm?.[key] !== false;
  }

  let efectivo = $state(untrack(() => initial('efectivo')));
  let transferencia = $state(untrack(() => initial('transferencia')));
  let tarjeta = $state(untrack(() => initial('tarjeta')));
  let credito = $state(untrack(() => initial('credito')));
  let submitting = $state(false);
  let statusMessage = $state<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    statusMessage = null;
    submitting = true;
    try {
      const methods: BusinessPaymentMethodsConfig = { efectivo, transferencia, tarjeta, credito };
      await updateBusinessPaymentMethods(businessId, methods, $t('act.payments_updated'));
      statusMessage = { kind: 'success', text: $t('cfg.payments_saved') };
    } catch (err) {
      statusMessage = { kind: 'error', text: $t('cfg.error_generic', { msg: err instanceof Error ? err.message : String(err) }) };
    } finally {
      submitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <label>
    <span>{$t('cfg.pm_cash')}</span>
    <input type="checkbox" bind:checked={efectivo} />
  </label>
  <label>
    <span>{$t('cfg.pm_transfer')}</span>
    <input type="checkbox" bind:checked={transferencia} />
  </label>
  <label>
    <span>{$t('cfg.pm_card')}</span>
    <input type="checkbox" bind:checked={tarjeta} />
  </label>
  <label>
    <span>{$t('cfg.pm_credit')}</span>
    <input type="checkbox" bind:checked={credito} />
  </label>

  {#if statusMessage}
    <p role={statusMessage.kind === 'error' ? 'alert' : 'status'}>{statusMessage.text}</p>
  {/if}

  <button type="submit" disabled={submitting}>{$t('cfg.save_payments')}</button>
</form>
