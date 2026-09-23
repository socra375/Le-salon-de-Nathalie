import { supabase } from './client';
import { ApiError, unwrap, unwrapNullable } from './errors';
import type { Tables, TablesInsert, TablesUpdate } from '../types/database.types';

export async function getBusinessById(id: string): Promise<Tables<'businesses'> | null> {
  const result = await supabase.from('businesses').select('*').eq('id', id).maybeSingle();
  return unwrapNullable(result);
}

export async function createBusiness(business: TablesInsert<'businesses'>): Promise<Tables<'businesses'>> {
  const result = await supabase.from('businesses').insert([business]).select().single();
  return unwrap(result);
}

/** Alta/actualización de una fila por `id` en un solo paso (usado en onboarding). */
export async function upsertBusiness(business: TablesInsert<'businesses'>): Promise<void> {
  const result = await supabase.from('businesses').upsert(business);
  unwrapNullable(result);
}

export async function updateBusiness(id: string, patch: TablesUpdate<'businesses'>): Promise<void> {
  const result = await supabase.from('businesses').update(patch).eq('id', id);
  unwrapNullable(result);
}

/**
 * Sube el logo/fondo del negocio al bucket `business-logos`. `path` debe
 * empezar por el `business_id` (política de storage: cada negocio solo
 * puede escribir en su propia carpeta, ver supabase/schema.sql).
 */
export async function uploadBusinessLogo(path: string, file: File): Promise<void> {
  const { error } = await supabase.storage.from('business-logos').upload(path, file, { upsert: true });
  if (error) throw new ApiError(error.message, error);
}

export function getBusinessLogoPublicUrl(path: string): string {
  return supabase.storage.from('business-logos').getPublicUrl(path).data.publicUrl;
}
