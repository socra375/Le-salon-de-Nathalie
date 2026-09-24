import { listEmployees, updateMemberRoleTitle } from '../api/businessMembers';
import { createEmployeeInvite } from '../api/employeeInvites';
import { logActivity } from '../api/activityLog';
import { employees } from '../stores/employees';
import { codeFromBytes } from '../utils/employees';

export async function loadEmployees(businessId: string): Promise<void> {
  employees.set(await listEmployees(businessId));
}

/**
 * `employee_invites.expires_at` tiene un default de 72 horas en la base
 * (migración 002), así que no hace falta mandarlo desde acá -- mismo
 * criterio que el legado.
 */
export async function generateInvite(businessId: string, activityMessage: string): Promise<string> {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const code = codeFromBytes(bytes);

  await createEmployeeInvite({ business_id: businessId, code });
  await logActivity({ business_id: businessId, action: activityMessage });
  return code;
}

export async function updateEmployeeRoleTitle(
  businessId: string,
  memberId: string,
  roleTitle: string,
  activityMessage: string
): Promise<void> {
  await updateMemberRoleTitle(memberId, roleTitle);
  await logActivity({ business_id: businessId, action: activityMessage });
}
