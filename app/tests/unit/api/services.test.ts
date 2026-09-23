import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockQueryResult } from '../support/supabaseMock';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));

const { listServices, createService, updateService, deleteService } = await import('../../../src/lib/api/services');
const { ApiError } = await import('../../../src/lib/api/errors');

beforeEach(() => {
  supabaseMock.from.mockReset();
});

describe('listServices', () => {
  it('filtra por business_id', async () => {
    const services = [{ id: 'svc-1', name: 'Corte' }];
    const builder = mockQueryResult(supabaseMock, { data: services, error: null });

    const result = await listServices('biz-1');

    expect(supabaseMock.from).toHaveBeenCalledWith('services');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'biz-1');
    expect(result).toEqual(services);
  });

  it('lanza ApiError si falla la consulta', async () => {
    mockQueryResult(supabaseMock, { data: null, error: { message: 'boom' } });
    await expect(listServices('biz-1')).rejects.toThrow(ApiError);
  });
});

describe('createService', () => {
  it('inserta y devuelve la fila creada', async () => {
    const payload = { business_id: 'biz-1', name: 'Corte', price: 500 };
    const created = { id: 'svc-1', ...payload };
    const builder = mockQueryResult(supabaseMock, { data: created, error: null });

    const result = await createService(payload);

    expect(builder.insert).toHaveBeenCalledWith([payload]);
    expect(result).toEqual(created);
  });
});

describe('updateService', () => {
  it('actualiza por id', async () => {
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await updateService('svc-1', { price: 600 });
    expect(builder.update).toHaveBeenCalledWith({ price: 600 });
    expect(builder.eq).toHaveBeenCalledWith('id', 'svc-1');
  });
});

describe('deleteService', () => {
  it('borra por id', async () => {
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await deleteService('svc-1');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'svc-1');
  });
});
