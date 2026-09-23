// Escapa texto antes de insertarlo como HTML crudo. Sin esto, un nombre de
// cliente, servicio o empleado que contenga etiquetas se ejecutaría como
// código en el navegador de quien abra la pantalla (el XSS almacenado que
// se corrigió en la Fase 0 del index.html legado).
//
// En los componentes Svelte de las próximas fases esto NO hace falta:
// `{expresión}` en una plantilla .svelte ya escapa por defecto. Esta
// función se conserva solo para los pocos lugares donde de verdad se sigue
// construyendo HTML/texto crudo a mano — p. ej. las líneas de texto del PDF.
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}
