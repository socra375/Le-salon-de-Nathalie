import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockQueryResult } from '../support/supabaseMock';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));

const { listSpecialistServices, deleteSpecialistServicesForService, createSpecialistServices } = await import(
  '../../../src/lib/api/specialistServices'
);

beforeEach(() => {
  supabaseMock.from.mockReset();
});

describe('listSpecialistServices', () => {
  it('filtra por business_id', async () => {
    const builder = mockQueryResult(supabaseMock, { data: [], error: null });
    await listSpecialistServices('biz-1');
    expect(supabaseMock.from).toHaveBeenCalledWith('specialist_services');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'biz-1');
  });
});

describe('deleteSpecialistServicesForService', () => {
  it('borra filtrando por service_id y business_id', async () => {
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await deleteSpecialistServicesForService('biz-1', 'svc-1');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'service_id', 'svc-1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'business_id', 'biz-1');
  });
});

describe('createSpecialistServices', () => {
  it('inserta las filas dadas', async () => {
    const rows = [{ business_id: 'biz-1', employee_id: 'emp-1', service_id: 'svc-1' }];
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await createSpecialistServices(rows);
    expect(builder.insert).toHaveBeenCalledWith(rows);
  });

  it('no llama a Supabase si el arreglo está vacío', async () => {
    await createSpecialistServices([]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
