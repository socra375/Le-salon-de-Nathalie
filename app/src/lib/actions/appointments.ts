import { listAppointments } from '../api/appointments';
import { appointments } from '../stores/appointments';

export async function loadAppointments(businessId: string): Promise<void> {
  appointments.set(await listAppointments(businessId));
}
