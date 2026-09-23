import { t, type Locale, type TranslationKey } from '../i18n';

/** La clave es lo que se guarda en invoices.payment_method; la etiqueta se traduce. */
export const PAYMENT_METHODS = [
  { key: 'efectivo', i18n: 'pay.cash' },
  { key: 'transferencia', i18n: 'pay.transfer' },
  { key: 'tarjeta', i18n: 'pay.card' },
  { key: 'credito', i18n: 'pay.credit' },
] as const satisfies { key: string; i18n: TranslationKey }[];

export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]['key'];

export function paymentMethodLabel(key: string, locale: Locale): string {
  const method = PAYMENT_METHODS.find((m) => m.key === key);
  return method ? t(locale, method.i18n) : key || '—';
}

/**
 * Solo los métodos habilitados en Configuración > Métodos de Pago. Recibe
 * `businesses.payment_methods` como parámetro (antes leía
 * `currentBusinessData?.payment_methods` de un global) — si no hay ninguno
 * habilitado (o el negocio no tiene el campo configurado todavía),
 * devuelve los 4 por defecto en vez de una lista vacía.
 */
export function enabledPaymentMethods(
  paymentMethodsConfig: Partial<Record<PaymentMethodKey, boolean>> | null | undefined
) {
  const enabled = PAYMENT_METHODS.filter((m) => paymentMethodsConfig?.[m.key] !== false);
  return enabled.length > 0 ? enabled : PAYMENT_METHODS;
}
