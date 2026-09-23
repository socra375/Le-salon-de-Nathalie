import { supabase } from './client';
import { unwrap, unwrapNullable } from './errors';
import type { Tables, TablesInsert } from '../types/database.types';

export async function listSpecialistServices(businessId: string): Promise<Tables<'specialist_services'>[]> {
  const result = await supabase.from('specialist_services').select('*').eq('business_id', businessId);
  return unwrap(result);
}

/**
 * Borra e insertar son dos pasos separados a propósito (cada uno es una
 * operación simple de esta tabla); el "reemplazar los especialistas de un
 * servicio" que los usa juntos es lógica de negocio de más de un paso —
 * vive en un módulo de acciones (Fase 5), no aquí.
 */
export async function deleteSpecialistServicesForService(businessId: string, serviceId: string): Promise<void> {
  const result = await supabase
    .from('specialist_services')
    .delete()
    .eq('service_id', serviceId)
    .eq('business_id', businessId);
  unwrapNullable(result);
}

export async function createSpecialistServices(rows: TablesInsert<'specialist_services'>[]): Promise<void> {
  if (rows.length === 0) return;
  const result = await supabase.from('specialist_services').insert(rows);
  unwrapNullable(result);
}
