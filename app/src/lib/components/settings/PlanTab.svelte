<script lang="ts">
  import { t, locale } from '../../stores/locale';
  import { businessAccess } from '../../stores/session';
  import { fmtDate } from '../../utils/format';
  import { teamWhatsappHref } from '../../utils/whatsapp';

  // El cliente y el equipo acuerdan el cambio de plan por WhatsApp; no hay
  // aprobación automatizada. El plan lo asigna el equipo (bot de Telegram).
  const whatsappHref = $derived(teamWhatsappHref($t('cfg.plan_whatsapp_message')));
  const access = $derived($businessAccess);
</script>

<div>
  <h2>{$t('cfg.plan_title')}</h2>
  {#if access?.plan}
    <p>
      <strong>{$t('cfg.plan_current', { plan: $t(`plan.${access.plan}`) })}</strong>
      {#if access.expires_at}
        — {$t('cfg.plan_expires', { date: fmtDate(access.expires_at, $locale) })}
      {/if}
    </p>
  {/if}
  <p>{$t('cfg.plan_body')}</p>
  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" role="button">
    {$t('cfg.plan_button')}
  </a>
</div>
