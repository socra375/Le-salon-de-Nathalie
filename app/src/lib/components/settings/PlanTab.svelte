<script lang="ts">
  import { t, locale } from '../../stores/locale';
  import { businessAccess } from '../../stores/session';
  import { createTelegramLinkCode } from '../../api/businessAccess';
  import { fmtDate, fmtTime } from '../../utils/format';
  import { teamWhatsappHref } from '../../utils/whatsapp';

  // El cliente y el equipo acuerdan el cambio de plan por WhatsApp; no hay
  // aprobación automatizada. El plan lo asigna el equipo (bot de Telegram).
  const whatsappHref = $derived(teamWhatsappHref($t('cfg.plan_whatsapp_message')));
  const access = $derived($businessAccess);

  let linkCode = $state<{ code: string; expires_at: string } | null>(null);
  let linkError = $state('');
  let generating = $state(false);

  async function generateLinkCode() {
    linkError = '';
    generating = true;
    try {
      linkCode = await createTelegramLinkCode();
    } catch (err) {
      linkError = $t('cfg.tg_error', { msg: err instanceof Error ? err.message : String(err) });
    } finally {
      generating = false;
    }
  }
</script>

<div>
  <h2>{$t('cfg.plan_title')}</h2>
  {#if access?.is_super_admin}
    <p><strong>{$t('cfg.plan_super_admin')}</strong></p>
  {:else if access?.plan}
    <p>
      <strong>{$t('cfg.plan_current', { plan: $t(`plan.${access.plan}`) })}</strong>
      {#if access.expires_at}
        — {$t('cfg.plan_expires', { date: fmtDate(access.expires_at, $locale) })}
      {/if}
    </p>
  {/if}

  {#if access?.is_super_admin}
    <section aria-labelledby="tg-title">
      <h3 id="tg-title">{$t('cfg.tg_title')}</h3>
      <p>{$t('cfg.tg_body')}</p>
      <button type="button" onclick={generateLinkCode} disabled={generating}>{$t('cfg.tg_button')}</button>
      {#if linkCode}
        <p>{$t('cfg.tg_code')} <code>/vincular {linkCode.code}</code></p>
        <p><small>{$t('cfg.tg_expires', { time: fmtTime(linkCode.expires_at, $locale) })}</small></p>
      {/if}
      {#if linkError}
        <p role="alert">{linkError}</p>
      {/if}
    </section>
  {:else}
    <p>{$t('cfg.plan_body')}</p>
    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" role="button">
      {$t('cfg.plan_button')}
    </a>
  {/if}
</div>
