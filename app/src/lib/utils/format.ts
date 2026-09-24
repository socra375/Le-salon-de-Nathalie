import type { Locale } from '../i18n';

/**
 * Igual que las fmt* del index.html legado, pero reciben el `locale` como
 * parámetro en vez de leer `currentLang` de un global — así son puras y
 * comprobables sin montar ningún estado de la app.
 */
export const LOCALE_MAP: Record<Locale, string> = {
  es: 'es-ES',
  en: 'en-US',
  fr: 'fr-FR',
  pt: 'pt-BR',
  de: 'de-DE',
  it: 'it-IT',
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function fmtDate(value: Date | string, locale: Locale): string {
  return toDate(value).toLocaleDateString(LOCALE_MAP[locale]);
}

export function fmtDateTime(value: Date | string, locale: Locale): string {
  return toDate(value).toLocaleString(LOCALE_MAP[locale]);
}

export function fmtTime(value: Date | string, locale: Locale): string {
  return toDate(value).toLocaleTimeString(LOCALE_MAP[locale], { hour: '2-digit', minute: '2-digit' });
}

/** Día de la semana abreviado (p. ej. "lun.") -- para las etiquetas del gráfico del dashboard. */
export function fmtWeekdayShort(value: Date | string, locale: Locale): string {
  return toDate(value).toLocaleDateString(LOCALE_MAP[locale], { weekday: 'short' });
}

/** Fecha larga con mayúscula inicial (p. ej. "Miércoles, 24 de septiembre") -- para el saludo del Inicio. */
export function fmtDateLong(value: Date | string, locale: Locale): string {
  const formatted = toDate(value).toLocaleDateString(LOCALE_MAP[locale], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
