import { supabase } from './client';
import { unwrap, unwrapNullable } from './errors';
import type { Tables, TablesInsert, TablesUpdate } from '../types/database.types';

export async function listServices(businessId: string): Promise<Tables<'services'>[]> {
  const result = await supabase.from('services').select('*').eq('business_id', businessId);
  return unwrap(result);
}

export async function createService(payload: TablesInsert<'services'>): Promise<Tables<'services'>> {
  const result = await supabase.from('services').insert([payload]).select().single();
  return unwrap(result);
}

export async function updateService(id: string, payload: TablesUpdate<'services'>): Promise<void> {
  const result = await supabase.from('services').update(payload).eq('id', id);
  unwrapNullable(result);
}

export async function deleteService(id: string): Promise<void> {
  const result = await supabase.from('services').delete().eq('id', id);
  unwrapNullable(result);
}
