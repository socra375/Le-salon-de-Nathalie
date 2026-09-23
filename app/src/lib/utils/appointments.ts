import type { Tables } from '../types/database.types';

type AppointmentServiceFields = Pick<Tables<'appointments'>, 'service_id' | 'service_ids'>;

/**
 * Soporta tanto citas nuevas con varios servicios (service_ids) como las
 * antiguas de un solo servicio (service_id). Todas las funciones de este
 * archivo reciben las snapshots (servicios/facturas/créditos) como
 * parámetro en vez de leer una variable global, a diferencia del legado.
 */
export function apptServiceIds(appt: AppointmentServiceFields): string[] {
  if (Array.isArray(appt.service_ids) && appt.service_ids.length > 0) {
    return appt.service_ids as string[];
  }
  return appt.service_id ? [appt.service_id] : [];
}

export function apptServices(appt: AppointmentServiceFields, services: Tables<'services'>[]): Tables<'services'>[] {
  return apptServiceIds(appt)
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Tables<'services'> => Boolean(s));
}

export function apptServicesLabel(appt: AppointmentServiceFields, services: Tables<'services'>[]): string {
  const names = apptServices(appt, services).map((s) => s.name);
  return names.length > 0 ? names.join(' + ') : 'N/A';
}

type AppointmentRevenueFields = AppointmentServiceFields & Pick<Tables<'appointments'>, 'price'>;

export function appointmentRevenue(appt: AppointmentRevenueFields, services: Tables<'services'>[]): number {
  if (appt.price != null) return parseFloat(String(appt.price));
  return apptServices(appt, services).reduce((acc, s) => acc + parseFloat(String(s.price ?? 0)), 0);
}

/**
 * Dinero realmente cobrado por una cita. Una venta a crédito (fiado) no es
 * ingreso hasta que el cliente paga: mientras tanto vive en "Cuentas por
 * Cobrar". Solo suma como ingreso la parte ya abonada, así el mismo dinero
 * nunca se cuenta dos veces (el bug que reportó la clienta y se corrigió
 * en esta misma sesión).
 */
export function collectedRevenue(
  appt: Tables<'appointments'>,
  services: Tables<'services'>[],
  invoices: Tables<'invoices'>[],
  credits: Tables<'customer_credits'>[]
): number {
  const invoice = invoices.find((inv) => inv.appointment_id === appt.id);
  if (!invoice || invoice.payment_method !== 'credito') return appointmentRevenue(appt, services);
  const credit = credits.find((cr) => cr.invoice_id === invoice.id);
  return credit ? parseFloat(String(credit.amount_paid ?? 0)) : 0;
}
