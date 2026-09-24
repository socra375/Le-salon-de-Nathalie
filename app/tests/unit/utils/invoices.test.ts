import { describe, expect, it } from 'vitest';
import { calculateInvoiceTax, generateInvoiceNumber } from '../../../src/lib/utils/invoices';

describe('calculateInvoiceTax', () => {
  it('sin impuesto habilitado, el subtotal es el ingreso completo y no hay impuesto', () => {
    expect(calculateInvoiceTax(1000, { tax_enabled: false, tax_percentage: 18, tax_included_in_price: false })).toEqual({
      subtotal: 1000,
      taxAmount: 0,
      total: 1000,
    });
  });

  it('sin negocio (null), se comporta igual que sin impuesto', () => {
    expect(calculateInvoiceTax(1000, null)).toEqual({ subtotal: 1000, taxAmount: 0, total: 1000 });
  });

  it('impuesto que se suma al vender: el subtotal no cambia, el total lo incluye', () => {
    const result = calculateInvoiceTax(1000, { tax_enabled: true, tax_percentage: 18, tax_included_in_price: false });
    expect(result.subtotal).toBe(1000);
    expect(result.taxAmount).toBeCloseTo(180);
    expect(result.total).toBeCloseTo(1180);
  });

  it('impuesto incluido en el precio: retro-calcula el subtotal a partir del total cobrado', () => {
    const result = calculateInvoiceTax(1180, { tax_enabled: true, tax_percentage: 18, tax_included_in_price: true });
    expect(result.subtotal).toBeCloseTo(1000);
    expect(result.taxAmount).toBeCloseTo(180);
    expect(result.total).toBeCloseTo(1180);
  });
});

describe('generateInvoiceNumber', () => {
  it('tiene el formato FAC-###### con 6 dígitos', () => {
    expect(generateInvoiceNumber()).toMatch(/^FAC-\d{6}$/);
  });
});
