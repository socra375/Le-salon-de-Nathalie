import { supabase } from './client';
import { unwrap, unwrapNullable } from './errors';
import type { Tables, TablesInsert } from '../types/database.types';

export async function listAppointments(businessId: string): Promise<Tables<'appointments'>[]> {
  const result = await supabase
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .order('start_at', { ascending: true });
  return unwrap(result);
}

export async function createAppointment(payload: TablesInsert<'appointments'>): Promise<void> {
  const result = await supabase.from('appointments').insert([payload]);
  unwrapNullable(result);
}

/** Enlaza una cita walk-in a un cliente ya registrado (p. ej. al fiar). */
export async function linkAppointmentCustomer(id: string, customerId: string): Promise<void> {
  const result = await supabase.from('appointments').update({ customer_id: customerId }).eq('id', id);
  unwrapNullable(result);
}

export async function updateAppointmentStatus(id: string, status: string): Promise<void> {
  const result = await supabase.from('appointments').update({ status }).eq('id', id);
  unwrapNullable(result);
}
