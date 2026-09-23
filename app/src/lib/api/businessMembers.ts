import { supabase } from './client';
import { unwrap, unwrapNullable } from './errors';
import type { Tables, TablesInsert } from '../types/database.types';

/** Resuelve a qué negocio pertenece un usuario y con qué rol (admin/employee). */
export async function getMembershipByUserId(userId: string): Promise<Tables<'business_members'> | null> {
  const result = await supabase.from('business_members').select('*').eq('user_id', userId).maybeSingle();
  return unwrapNullable(result);
}

export async function upsertBusinessMember(member: TablesInsert<'business_members'>): Promise<void> {
  const result = await supabase.from('business_members').upsert([member]);
  unwrapNullable(result);
}

export async function listEmployees(businessId: string): Promise<Tables<'business_members'>[]> {
  const result = await supabase
    .from('business_members')
    .select('*')
    .eq('business_id', businessId)
    .eq('role', 'employee');
  return unwrap(result);
}

export async function updateMemberRoleTitle(id: string, roleTitle: string): Promise<void> {
  const result = await supabase.from('business_members').update({ role_title: roleTitle }).eq('id', id);
  unwrapNullable(result);
}
