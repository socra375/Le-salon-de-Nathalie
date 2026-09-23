import { supabase } from './client';
import { unwrap, unwrapNullable } from './errors';
import type { Tables, TablesInsert } from '../types/database.types';

export async function logActivity(payload: TablesInsert<'activity_log'>): Promise<void> {
  const result = await supabase.from('activity_log').insert([payload]);
  unwrapNullable(result);
}

export async function listActivityLog(businessId: string, limit = 30): Promise<Tables<'activity_log'>[]> {
  const result = await supabase
    .from('activity_log')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return unwrap(result);
}
