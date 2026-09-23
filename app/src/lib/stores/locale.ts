import { writable, derived } from 'svelte/store';
import { DEFAULT_LOCALE, isLocale, t as translate, type Locale, type TranslationKey } from '../i18n';

const STORAGE_KEY = 'gs_lang';

/**
 * Mismo criterio que el legado: el idioma elegido persiste en
 * localStorage y se usa incluso antes de iniciar sesión (login/onboarding
 * no dependen todavía de `businesses.language`, que solo se conoce después
 * de autenticarse).
 */
function readInitialLocale(): Locale {
  if (typeof localStorage === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && isLocale(stored) ? stored : DEFAULT_LOCALE;
}

export const locale = writable<Locale>(readInitialLocale());

locale.subscribe((value) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
});

/**
 * Store derivado que expone `t` como función reactiva al idioma actual:
 * en un componente, `import { t } from '.../stores/locale'` y usar
 * `$t('clave', { var: 1 })` — se re-evalúa solo cuando cambia `locale`.
 */
export const t = derived(locale, ($locale) => (key: TranslationKey, vars?: Record<string, string | number>) =>
  translate($locale, key, vars)
);
