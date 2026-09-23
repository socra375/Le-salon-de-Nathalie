import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockQueryResult } from '../support/supabaseMock';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));

const { listCustomers, createCustomer } = await import('../../../src/lib/api/customers');

beforeEach(() => {
  supabaseMock.from.mockReset();
});

describe('listCustomers', () => {
  it('filtra por business_id', async () => {
    const builder = mockQueryResult(supabaseMock, { data: [], error: null });
    await listCustomers('biz-1');
    expect(supabaseMock.from).toHaveBeenCalledWith('customers');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'biz-1');
  });
});

describe('createCustomer', () => {
  it('inserta la fila envuelta en un arreglo', async () => {
    const payload = { business_id: 'biz-1', name: 'Ana Pérez', phone: '809-000' };
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await createCustomer(payload);
    expect(builder.insert).toHaveBeenCalledWith([payload]);
  });
});
