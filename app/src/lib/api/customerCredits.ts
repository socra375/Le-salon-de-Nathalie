import { supabase } from './client';
import { unwrap, unwrapNullable } from './errors';
import type { Tables, TablesInsert, TablesUpdate } from '../types/database.types';

export async function listCustomerCredits(businessId: string): Promise<Tables<'customer_credits'>[]> {
  const result = await supabase.from('customer_credits').select('*').eq('business_id', businessId);
  return unwrap(result);
}

export async function createCustomerCredit(payload: TablesInsert<'customer_credits'>): Promise<void> {
  const result = await supabase.from('customer_credits').insert([payload]);
  unwrapNullable(result);
}

export async function updateCustomerCredit(id: string, patch: TablesUpdate<'customer_credits'>): Promise<void> {
  const result = await supabase.from('customer_credits').update(patch).eq('id', id);
  unwrapNullable(result);
}
