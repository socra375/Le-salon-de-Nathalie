import { describe, expect, it } from 'vitest';
import { apptStatusLabel, creditStatusLabel } from '../../../src/lib/utils/labels';

describe('apptStatusLabel', () => {
  it('traduce cada estado en español', () => {
    expect(apptStatusLabel('pendiente', 'es')).toBe('PENDIENTE');
    expect(apptStatusLabel('confirmada', 'es')).toBe('CONFIRMADA');
    expect(apptStatusLabel('completada', 'es')).toBe('COMPLETADA');
    expect(apptStatusLabel('cancelada', 'es')).toBe('CANCELADA');
    expect(apptStatusLabel('no_show', 'es')).toBe('NO SHOW');
  });

  it('traduce en otro idioma', () => {
    expect(apptStatusLabel('completada', 'en')).toBe('COMPLETED');
    expect(apptStatusLabel('completada', 'it')).toBe('COMPLETATO');
  });
});

describe('creditStatusLabel', () => {
  it('traduce cada estado de crédito', () => {
    expect(creditStatusLabel('pendiente', 'es')).toBe('PENDIENTE');
    expect(creditStatusLabel('parcial', 'es')).toBe('PARCIAL');
    expect(creditStatusLabel('pagado', 'es')).toBe('PAGADO');
    expect(creditStatusLabel('pagado', 'pt')).toBe('PAGO');
  });
});
