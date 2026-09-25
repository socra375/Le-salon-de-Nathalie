// Número de WhatsApp del equipo (no del negocio del cliente): ahí se
// coordinan cambios de plan y reactivaciones de cuenta.
export const TEAM_WHATSAPP_NUMBER = '18299788249';

export function teamWhatsappHref(message: string): string {
  return `https://wa.me/${TEAM_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
