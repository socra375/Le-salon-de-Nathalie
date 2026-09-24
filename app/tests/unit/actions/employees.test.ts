import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

const businessMembersApiMock = vi.hoisted(() => ({
  listEmployees: vi.fn(),
  updateMemberRoleTitle: vi.fn(),
}));
vi.mock('../../../src/lib/api/businessMembers', () => businessMembersApiMock);

const employeeInvitesApiMock = vi.hoisted(() => ({ createEmployeeInvite: vi.fn() }));
vi.mock('../../../src/lib/api/employeeInvites', () => employeeInvitesApiMock);

const activityLogApiMock = vi.hoisted(() => ({ logActivity: vi.fn() }));
vi.mock('../../../src/lib/api/activityLog', () => activityLogApiMock);

const { loadEmployees, generateInvite, updateEmployeeRoleTitle } = await import(
  '../../../src/lib/actions/employees'
);
const { employees } = await import('../../../src/lib/stores/employees');

beforeEach(() => {
  vi.clearAllMocks();
  employees.set([]);
});

describe('loadEmployees', () => {
  it('carga los empleados del negocio en el store', async () => {
    businessMembersApiMock.listEmployees.mockResolvedValue([{ id: 'm1' }]);
    await loadEmployees('biz-1');
    expect(businessMembersApiMock.listEmployees).toHaveBeenCalledWith('biz-1');
    expect(get(employees)).toEqual([{ id: 'm1' }]);
  });
});

describe('generateInvite', () => {
  it('genera un código con el formato EMP + 10 caracteres, lo guarda y registra actividad', async () => {
    employeeInvitesApiMock.createEmployeeInvite.mockResolvedValue(undefined);

    const code = await generateInvite('biz-1', 'Generó un código de invitación');

    expect(code).toMatch(/^EMP[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/);
    expect(employeeInvitesApiMock.createEmployeeInvite).toHaveBeenCalledWith({ business_id: 'biz-1', code });
    expect(activityLogApiMock.logActivity).toHaveBeenCalledWith({
      business_id: 'biz-1',
      action: 'Generó un código de invitación',
    });
  });
});

describe('updateEmployeeRoleTitle', () => {
  it('actualiza el cargo del empleado y registra actividad', async () => {
    businessMembersApiMock.updateMemberRoleTitle.mockResolvedValue(undefined);

    await updateEmployeeRoleTitle('biz-1', 'member-1', 'Estilista senior', 'Actualizó el cargo a "Estilista senior"');

    expect(businessMembersApiMock.updateMemberRoleTitle).toHaveBeenCalledWith('member-1', 'Estilista senior');
    expect(activityLogApiMock.logActivity).toHaveBeenCalledWith({
      business_id: 'biz-1',
      action: 'Actualizó el cargo a "Estilista senior"',
    });
  });
});
