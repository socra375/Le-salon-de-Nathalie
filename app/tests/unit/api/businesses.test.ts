import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockQueryResult, mockStorageResult } from '../support/supabaseMock';

// vi.hoisted no puede referenciar un helper importado (los imports aún no
// están enlazados cuando corre) — se construye el mock en línea aquí y se
// usa el helper importado solo dentro de los `it(...)`, más abajo.
const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));

const { getBusinessById, createBusiness, upsertBusiness, updateBusiness, uploadBusinessLogo, getBusinessLogoPublicUrl } =
  await import('../../../src/lib/api/businesses');
const { ApiError } = await import('../../../src/lib/api/errors');

beforeEach(() => {
  supabaseMock.from.mockReset();
});

describe('getBusinessById', () => {
  it('devuelve el negocio cuando existe', async () => {
    const business = { id: 'biz-1', name: 'Le Salon' };
    const builder = mockQueryResult(supabaseMock, { data: business, error: null });

    const result = await getBusinessById('biz-1');

    expect(supabaseMock.from).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.eq).toHaveBeenCalledWith('id', 'biz-1');
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(result).toEqual(business);
  });

  it('devuelve null cuando no existe, sin lanzar', async () => {
    mockQueryResult(supabaseMock, { data: null, error: null });
    await expect(getBusinessById('no-existe')).resolves.toBeNull();
  });

  it('lanza ApiError si PostgREST devuelve un error', async () => {
    mockQueryResult(supabaseMock, { data: null, error: { message: 'boom' } });
    await expect(getBusinessById('biz-1')).rejects.toThrow(ApiError);
  });
});

describe('createBusiness', () => {
  it('inserta y devuelve la fila creada', async () => {
    const created = { id: 'biz-1', name: 'Mi Salón' };
    const builder = mockQueryResult(supabaseMock, { data: created, error: null });

    const result = await createBusiness({ id: 'biz-1', name: 'Mi Salón' });

    expect(builder.insert).toHaveBeenCalledWith([{ id: 'biz-1', name: 'Mi Salón' }]);
    expect(builder.select).toHaveBeenCalled();
    expect(builder.single).toHaveBeenCalled();
    expect(result).toEqual(created);
  });
});

describe('upsertBusiness', () => {
  it('llama upsert con la fila dada', async () => {
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await upsertBusiness({ id: 'biz-1', name: 'Mi Salón', business_type: 'individual' });
    expect(builder.upsert).toHaveBeenCalledWith({ id: 'biz-1', name: 'Mi Salón', business_type: 'individual' });
  });
});

describe('updateBusiness', () => {
  it('actualiza solo el negocio con ese id', async () => {
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await updateBusiness('biz-1', { theme: 'light' });
    expect(builder.update).toHaveBeenCalledWith({ theme: 'light' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'biz-1');
  });
});

describe('uploadBusinessLogo / getBusinessLogoPublicUrl', () => {
  it('sube el archivo al bucket business-logos con upsert', async () => {
    const { upload } = mockStorageResult(supabaseMock);
    const file = new File(['x'], 'logo.png');

    await uploadBusinessLogo('biz-1/logo.png', file);

    expect(supabaseMock.storage.from).toHaveBeenCalledWith('business-logos');
    expect(upload).toHaveBeenCalledWith('biz-1/logo.png', file, { upsert: true });
  });

  it('lanza ApiError si la subida falla', async () => {
    mockStorageResult(supabaseMock, { uploadError: { message: 'no space' } });
    await expect(uploadBusinessLogo('biz-1/logo.png', new File(['x'], 'logo.png'))).rejects.toThrow(ApiError);
  });

  it('devuelve la URL pública del archivo', () => {
    mockStorageResult(supabaseMock, { publicUrl: 'https://example.test/biz-1/logo.png' });
    expect(getBusinessLogoPublicUrl('biz-1/logo.png')).toBe('https://example.test/biz-1/logo.png');
  });
});
