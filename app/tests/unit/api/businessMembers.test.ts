import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockQueryResult } from '../support/supabaseMock';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));

const { getMembershipByUserId, upsertBusinessMember, listEmployees, updateMemberRoleTitle } = await import(
  '../../../src/lib/api/businessMembers'
);
const { ApiError } = await import('../../../src/lib/api/errors');

beforeEach(() => {
  supabaseMock.from.mockReset();
});

describe('getMembershipByUserId', () => {
  it('devuelve la fila de membresía filtrando por user_id', async () => {
    const member = { business_id: 'biz-1', role: 'employee' };
    const builder = mockQueryResult(supabaseMock, { data: member, error: null });

    const result = await getMembershipByUserId('user-1');

    expect(supabaseMock.from).toHaveBeenCalledWith('business_members');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(result).toEqual(member);
  });

  it('devuelve null si el usuario no tiene membresía (es admin/dueño)', async () => {
    mockQueryResult(supabaseMock, { data: null, error: null });
    await expect(getMembershipByUserId('user-1')).resolves.toBeNull();
  });
});

describe('upsertBusinessMember', () => {
  it('llama upsert envolviendo la fila en un arreglo', async () => {
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await upsertBusinessMember({ business_id: 'biz-1', user_id: 'biz-1', role: 'admin' });
    expect(builder.upsert).toHaveBeenCalledWith([{ business_id: 'biz-1', user_id: 'biz-1', role: 'admin' }]);
  });
});

describe('listEmployees', () => {
  it('filtra por business_id y role = employee', async () => {
    const builder = mockQueryResult(supabaseMock, { data: [], error: null });
    await listEmployees('biz-1');
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'business_id', 'biz-1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'role', 'employee');
  });

  it('lanza ApiError si falla la consulta', async () => {
    mockQueryResult(supabaseMock, { data: null, error: { message: 'boom' } });
    await expect(listEmployees('biz-1')).rejects.toThrow(ApiError);
  });
});

describe('updateMemberRoleTitle', () => {
  it('actualiza role_title por id', async () => {
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await updateMemberRoleTitle('member-1', 'Estilista senior');
    expect(builder.update).toHaveBeenCalledWith({ role_title: 'Estilista senior' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'member-1');
  });
});
