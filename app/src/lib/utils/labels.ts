import { t, type Locale, type TranslationKey } from '../i18n';

/**
 * En el legado esto era `t('appt.status_' + status)` — concatenar la
 * clave a mano no lo revisa TypeScript. Aquí el mapa hace de único lugar
 * donde puede haber un typo, y `satisfies` obliga a que cada valor sea de
 * verdad una clave de traducción existente.
 */
const APPOINTMENT_STATUS_KEYS = {
  pendiente: 'appt.status_pendiente',
  confirmada: 'appt.status_confirmada',
  completada: 'appt.status_completada',
  cancelada: 'appt.status_cancelada',
  no_show: 'appt.status_no_show',
} as const satisfies Record<string, TranslationKey>;

export type AppointmentStatus = keyof typeof APPOINTMENT_STATUS_KEYS;

export function apptStatusLabel(status: AppointmentStatus, locale: Locale): string {
  return t(locale, APPOINTMENT_STATUS_KEYS[status]);
}

const CREDIT_STATUS_KEYS = {
  pendiente: 'credit.status_pendiente',
  parcial: 'credit.status_parcial',
  pagado: 'credit.status_pagado',
} as const satisfies Record<string, TranslationKey>;

export type CreditStatus = keyof typeof CREDIT_STATUS_KEYS;

export function creditStatusLabel(status: CreditStatus, locale: Locale): string {
  return t(locale, CREDIT_STATUS_KEYS[status]);
}
