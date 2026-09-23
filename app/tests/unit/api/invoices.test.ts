import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockQueryResult } from '../support/supabaseMock';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));

const { listInvoices, createInvoice } = await import('../../../src/lib/api/invoices');

beforeEach(() => {
  supabaseMock.from.mockReset();
});

describe('listInvoices', () => {
  it('filtra por negocio y ordena por created_at descendente', async () => {
    const builder = mockQueryResult(supabaseMock, { data: [], error: null });
    await listInvoices('biz-1');
    expect(supabaseMock.from).toHaveBeenCalledWith('invoices');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'biz-1');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

describe('createInvoice', () => {
  it('inserta y devuelve la factura creada', async () => {
    const payload = {
      business_id: 'biz-1',
      appointment_id: 'appt-1',
      invoice_number: 'FAC-100000',
      subtotal: 500,
      total: 590,
    };
    const created = { id: 'inv-1', ...payload };
    const builder = mockQueryResult(supabaseMock, { data: created, error: null });

    const result = await createInvoice(payload);

    expect(builder.insert).toHaveBeenCalledWith([payload]);
    expect(builder.select).toHaveBeenCalled();
    expect(builder.single).toHaveBeenCalled();
    expect(result).toEqual(created);
  });
});
