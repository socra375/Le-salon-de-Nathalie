import { get } from 'svelte/store';
import { listAppointments, createAppointment as apiCreateAppointment, updateAppointmentStatus as apiUpdateAppointmentStatus, linkAppointmentCustomer as apiLinkAppointmentCustomer } from '../api/appointments';
import { logActivity } from '../api/activityLog';
import { appointments } from '../stores/appointments';
import { buildAppointmentNotes } from '../utils/appointments';
import type { AppointmentStatus } from '../utils/labels';
import type { Tables, TablesInsert } from '../types/database.types';

export async function loadAppointments(businessId: string): Promise<void> {
  appointments.set(await listAppointments(businessId));
}

export interface CreateAppointmentInput {
  businessId: string;
  customerId: string | null;
  walkinName: string;
  specialistId: string;
  serviceIds: string[];
  services: Tables<'services'>[];
  startAt: Date;
  notes: string;
}

/**
 * La cita ocupa la suma de las duraciones de los servicios elegidos y
 * cuesta la suma de sus precios -- igual que el formulario del legado.
 */
export async function createAppointment(input: CreateAppointmentInput, activityMessage: string): Promise<void> {
  const [primaryServiceId] = input.serviceIds;
  if (!primaryServiceId) throw new Error('createAppointment requiere al menos un servicio');

  const services = input.serviceIds
    .map((id) => input.services.find((s) => s.id === id))
    .filter((s): s is Tables<'services'> => Boolean(s));

  const totalMinutes = services.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const totalPrice = services.reduce((acc, s) => acc + Number(s.price || 0), 0);
  const endAt = new Date(input.startAt.getTime() + totalMinutes * 60000);

  const payload: TablesInsert<'appointments'> = {
    business_id: input.businessId,
    customer_id: input.customerId,
    employee_id: input.specialistId,
    service_id: primaryServiceId,
    service_ids: input.serviceIds,
    start_at: input.startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: 'pendiente',
    price: totalPrice,
    notes: buildAppointmentNotes(Boolean(input.customerId), input.walkinName, input.notes),
  };

  await apiCreateAppointment(payload);
  await logActivity({ business_id: input.businessId, action: activityMessage });
  await loadAppointments(input.businessId);
}

/**
 * Cambia el estado de una cita y registra actividad. "completada" además
 * factura -- eso lo orquesta `actions/completeAppointment.ts`, que llama
 * esta misma función para el cambio de estado y luego crea la factura.
 */
export async function changeAppointmentStatus(
  businessId: string,
  id: string,
  status: AppointmentStatus,
  activityMessage: string
): Promise<void> {
  await apiUpdateAppointmentStatus(id, status);
  await logActivity({ business_id: businessId, action: activityMessage });
  await loadAppointments(businessId);
}

/**
 * Enlaza una cita walk-in a un cliente ya registrado (p. ej. al elegir
 * fiarla desde el modal de método de pago) -- de forma permanente, para
 * que quede registrada en el historial de ese cliente de ahí en más.
 */
export async function linkAppointmentCustomer(id: string, customerId: string): Promise<void> {
  await apiLinkAppointmentCustomer(id, customerId);
  appointments.update((list) => list.map((a) => (a.id === id ? { ...a, customer_id: customerId } : a)));
}

export function findAppointment(id: string): Tables<'appointments'> | undefined {
  return get(appointments).find((a) => a.id === id);
}
