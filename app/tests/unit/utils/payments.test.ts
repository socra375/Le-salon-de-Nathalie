import { describe, expect, it } from 'vitest';
import { PAYMENT_METHODS, paymentMethodLabel, enabledPaymentMethods } from '../../../src/lib/utils/payments';

describe('paymentMethodLabel', () => {
  it('traduce cada método conocido', () => {
    expect(paymentMethodLabel('efectivo', 'es')).toBe('Efectivo');
    expect(paymentMethodLabel('credito', 'en')).toBe('Credit (tab)');
  });

  it('devuelve la clave cruda (o —) si el método no existe', () => {
    expect(paymentMethodLabel('bitcoin', 'es')).toBe('bitcoin');
    expect(paymentMethodLabel('', 'es')).toBe('—');
  });
});

describe('enabledPaymentMethods', () => {
  it('sin configuración, devuelve los 4 métodos por defecto', () => {
    expect(enabledPaymentMethods(null)).toEqual(PAYMENT_METHODS);
    expect(enabledPaymentMethods(undefined)).toEqual(PAYMENT_METHODS);
  });

  it('excluye los métodos explícitamente deshabilitados (=== false)', () => {
    const result = enabledPaymentMethods({ credito: false });
    expect(result.map((m) => m.key)).toEqual(['efectivo', 'transferencia', 'tarjeta']);
  });

  it('si TODOS quedan deshabilitados, cae de vuelta a los 4 por defecto', () => {
    const result = enabledPaymentMethods({ efectivo: false, transferencia: false, tarjeta: false, credito: false });
    expect(result).toEqual(PAYMENT_METHODS);
  });
});
