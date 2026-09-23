import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockQueryResult } from '../support/supabaseMock';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));

const { listCustomerCredits, createCustomerCredit, updateCustomerCredit } = await import(
  '../../../src/lib/api/customerCredits'
);

beforeEach(() => {
  supabaseMock.from.mockReset();
});

describe('listCustomerCredits', () => {
  it('filtra por business_id', async () => {
    const builder = mockQueryResult(supabaseMock, { data: [], error: null });
    await listCustomerCredits('biz-1');
    expect(supabaseMock.from).toHaveBeenCalledWith('customer_credits');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'biz-1');
  });
});

describe('createCustomerCredit', () => {
  it('inserta la fila envuelta en un arreglo', async () => {
    const payload = { business_id: 'biz-1', customer_id: 'cli-1', amount: 1770, amount_paid: 0, status: 'pendiente' };
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await createCustomerCredit(payload);
    expect(builder.insert).toHaveBeenCalledWith([payload]);
  });
});

describe('updateCustomerCredit', () => {
  it('registra un abono actualizando amount_paid y status', async () => {
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await updateCustomerCredit('credit-1', { amount_paid: 770, status: 'parcial' });
    expect(builder.update).toHaveBeenCalledWith({ amount_paid: 770, status: 'parcial' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'credit-1');
  });
});
