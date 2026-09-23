import es from './es.json';
import en from './en.json';
import fr from './fr.json';
import pt from './pt.json';
import de from './de.json';
import it from './it.json';

/**
 * `es` es la referencia: siempre tiene las 292 claves completas (es el
 * idioma en el que se escribe la app). El resto se valida contra ella en
 * tests/unit/i18n.test.ts — un idioma con una clave de más o de menos
 * falla la prueba, no se descubre en producción mostrando la clave cruda.
 */
export const TRANSLATIONS = { es, en, fr, pt, de, it } as const;

export type Locale = keyof typeof TRANSLATIONS;
export const LOCALES: Locale[] = ['es', 'en', 'fr', 'pt', 'de', 'it'];
export const DEFAULT_LOCALE: Locale = 'es';

export type TranslationKey = keyof typeof es;

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

type TranslationVars = Record<string, string | number>;

/**
 * Igual que la `t(key, vars)` del index.html legado: si la clave falta en
 * el idioma pedido, cae a español; si falta también ahí, devuelve la
 * clave cruda en vez de reventar (mismo comportamiento, ahora tipado).
 */
export function t(locale: Locale, key: TranslationKey, vars?: TranslationVars): string {
  const dict = TRANSLATIONS[locale] as Partial<Record<TranslationKey, string>>;
  let value: string = dict[key] ?? TRANSLATIONS[DEFAULT_LOCALE][key] ?? key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.split(`{{${name}}}`).join(String(replacement));
    }
  }
  return value;
}
