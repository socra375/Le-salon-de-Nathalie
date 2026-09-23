import { supabase } from './client';
import { unwrapNullable } from './errors';
import type { TablesInsert } from '../types/database.types';

export async function createEmployeeInvite(payload: TablesInsert<'employee_invites'>): Promise<void> {
  const result = await supabase.from('employee_invites').insert([payload]);
  unwrapNullable(result);
}

/**
 * RPC security definer: valida el código, lo marca usado y afilia al
 * usuario actual como empleado del negocio. Vive aquí (y no en un
 * archivo aparte) porque opera exclusivamente sobre employee_invites y
 * business_members como efecto de canjear una invitación — es del mismo
 * dominio, no una tabla propia.
 */
export async function redeemInviteCode(code: string, employeeName: string): Promise<string> {
  const result = await supabase.rpc('redeem_invite_code', {
    input_code: code,
    input_employee_name: employeeName,
  });
  return unwrapNullable(result) as string;
}
