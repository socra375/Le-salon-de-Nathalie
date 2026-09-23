import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockQueryResult } from '../support/supabaseMock';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));

const { logActivity, listActivityLog } = await import('../../../src/lib/api/activityLog');

beforeEach(() => {
  supabaseMock.from.mockReset();
});

describe('logActivity', () => {
  it('inserta la fila envuelta en un arreglo', async () => {
    const payload = { business_id: 'biz-1', user_id: 'user-1', action: 'Servicio creado' };
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await logActivity(payload);
    expect(builder.insert).toHaveBeenCalledWith([payload]);
  });
});

describe('listActivityLog', () => {
  it('filtra por negocio, ordena descendente y limita a 30 por defecto', async () => {
    const builder = mockQueryResult(supabaseMock, { data: [], error: null });
    await listActivityLog('biz-1');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'biz-1');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(30);
  });

  it('acepta un límite distinto', async () => {
    const builder = mockQueryResult(supabaseMock, { data: [], error: null });
    await listActivityLog('biz-1', 5);
    expect(builder.limit).toHaveBeenCalledWith(5);
  });
});
