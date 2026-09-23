import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockQueryResult } from '../support/supabaseMock';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));

const { createEmployeeInvite, redeemInviteCode } = await import('../../../src/lib/api/employeeInvites');
const { ApiError } = await import('../../../src/lib/api/errors');

beforeEach(() => {
  supabaseMock.from.mockReset();
  supabaseMock.rpc.mockReset();
});

describe('createEmployeeInvite', () => {
  it('inserta la fila envuelta en un arreglo', async () => {
    const payload = { business_id: 'biz-1', code: 'EMPABC123XY' };
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await createEmployeeInvite(payload);
    expect(supabaseMock.from).toHaveBeenCalledWith('employee_invites');
    expect(builder.insert).toHaveBeenCalledWith([payload]);
  });
});

describe('redeemInviteCode', () => {
  it('llama al RPC con el código y nombre dados, y devuelve el business_id', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 'biz-1', error: null });

    const result = await redeemInviteCode('EMPABC123XY', 'Empleada de Prueba');

    expect(supabaseMock.rpc).toHaveBeenCalledWith('redeem_invite_code', {
      input_code: 'EMPABC123XY',
      input_employee_name: 'Empleada de Prueba',
    });
    expect(result).toBe('biz-1');
  });

  it('lanza ApiError si el código es inválido o venció', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: 'El código de invitación venció' } });
    await expect(redeemInviteCode('EXPIRADO', 'X')).rejects.toThrow(ApiError);
  });
});
