import { supabase } from './client';
import { unwrap } from './errors';
import type { Tables, TablesInsert } from '../types/database.types';

export async function listInvoices(businessId: string): Promise<Tables<'invoices'>[]> {
  const result = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  return unwrap(result);
}

export async function createInvoice(payload: TablesInsert<'invoices'>): Promise<Tables<'invoices'>> {
  const result = await supabase.from('invoices').insert([payload]).select().single();
  return unwrap(result);
}
