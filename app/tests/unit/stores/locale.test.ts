import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

describe('locale store', () => {
  beforeEach(() => {
    localStorage.clear();
    // El módulo lee localStorage una sola vez, al cargarse (arranque del
    // store) -- hace falta reimportarlo desde cero en cada prueba para
    // que ese arranque vea el localStorage ya limpiado arriba.
    vi.resetModules();
  });

  it('arranca en español si no hay nada guardado', async () => {
    const { locale } = await import('../../../src/lib/stores/locale');
    expect(get(locale)).toBe('es');
  });

  it('persiste el idioma elegido en localStorage', async () => {
    const { locale } = await import('../../../src/lib/stores/locale');
    locale.set('de');
    expect(localStorage.getItem('gs_lang')).toBe('de');
  });

  it('t($locale) traduce reactivamente al cambiar el idioma', async () => {
    const { locale, t } = await import('../../../src/lib/stores/locale');
    locale.set('en');
    expect(get(t)('common.cancel')).toBe('Cancel');
    locale.set('it');
    expect(get(t)('common.cancel')).toBe('Annulla');
  });
});
