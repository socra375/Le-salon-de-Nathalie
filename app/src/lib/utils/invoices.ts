import type { Tables } from '../types/database.types';

export interface InvoiceTaxBreakdown {
  subtotal: number;
  taxAmount: number;
  total: number;
}

type TaxSettings = Pick<Tables<'businesses'>, 'tax_enabled' | 'tax_percentage' | 'tax_included_in_price'>;

/**
 * Igual que el legado: sin impuesto habilitado, el subtotal es el ingreso
 * completo. Con impuesto "incluido en el precio", se retro-calcula el
 * subtotal a partir del total ya cobrado; "se suma al vender" lo agrega
 * encima.
 */
export function calculateInvoiceTax(revenue: number, business: TaxSettings | null): InvoiceTaxBreakdown {
  const taxEnabled = business?.tax_enabled ?? false;
  const taxRate = taxEnabled ? Number(business?.tax_percentage ?? 0) / 100 : 0;

  let subtotal = revenue;
  let taxAmount = 0;

  if (taxEnabled) {
    if (business?.tax_included_in_price) {
      subtotal = revenue / (1 + taxRate);
      taxAmount = revenue - subtotal;
    } else {
      taxAmount = revenue * taxRate;
    }
  }

  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

export function generateInvoiceNumber(): string {
  return 'FAC-' + Math.floor(100000 + Math.random() * 900000);
}
