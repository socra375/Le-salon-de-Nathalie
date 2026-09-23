import { describe, expect, it } from 'vitest';
import { fmtDate, fmtDateTime, fmtTime, LOCALE_MAP } from '../../../src/lib/utils/format';
import { LOCALES } from '../../../src/lib/i18n';

describe('LOCALE_MAP', () => {
  it('tiene una entrada BCP-47 para cada idioma soportado', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_MAP[locale]).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
  });
});

describe('fmtDate / fmtDateTime / fmtTime', () => {
  const date = new Date(2026, 0, 15, 14, 30);

  it('formatea la fecha según el locale pedido, no un global', () => {
    expect(fmtDate(date, 'es')).toBe(date.toLocaleDateString('es-ES'));
    expect(fmtDate(date, 'de')).toBe(date.toLocaleDateString('de-DE'));
  });

  it('acepta un string ISO igual que un Date', () => {
    const iso = date.toISOString();
    expect(fmtDate(iso, 'es')).toBe(fmtDate(new Date(iso), 'es'));
  });

  it('fmtDateTime incluye fecha y hora', () => {
    expect(fmtDateTime(date, 'en')).toBe(date.toLocaleString('en-US'));
  });

  it('fmtTime usa formato de 2 dígitos para hora y minuto', () => {
    expect(fmtTime(date, 'en')).toBe(date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  });
});
