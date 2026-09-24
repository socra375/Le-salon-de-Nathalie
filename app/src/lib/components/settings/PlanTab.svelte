<script lang="ts">
  import { t } from '../../stores/locale';

  // Número de WhatsApp del equipo (no del negocio del cliente) al que se
  // dirige toda solicitud de cambio de plan -- el cliente y el equipo
  // acuerdan el cambio por chat, no hay aprobación/rechazo automatizado.
  const WHATSAPP_NUMBER = '18299788249';

  const whatsappHref = $derived(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent($t('cfg.plan_whatsapp_message'))}`
  );
</script>

<div>
  <h2>{$t('cfg.plan_title')}</h2>
  <p>{$t('cfg.plan_body')}</p>
  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" role="button">
    {$t('cfg.plan_button')}
  </a>
</div>
