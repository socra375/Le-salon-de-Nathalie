import { supabase } from './client';
import { unwrap, unwrapNullable } from './errors';
import type { Tables, TablesInsert } from '../types/database.types';

export async function listCustomers(businessId: string): Promise<Tables<'customers'>[]> {
  const result = await supabase.from('customers').select('*').eq('business_id', businessId);
  return unwrap(result);
}

export async function createCustomer(payload: TablesInsert<'customers'>): Promise<void> {
  const result = await supabase.from('customers').insert([payload]);
  unwrapNullable(result);
}
