import { vi } from 'vitest';

/**
 * Mock mínimo y encadenable del cliente de supabase-js, para probar cada
 * función de app/src/lib/api/*.ts sin red real.
 *
 * Uso típico en un archivo de prueba:
 *
 *   const supabaseMock = vi.hoisted(() => createEmptySupabaseMock());
 *   vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));
 *
 *   it('...', async () => {
 *     const builder = mockQueryResult(supabaseMock, { data: [...], error: null });
 *     await listServices('biz-1');
 *     expect(supabaseMock.from).toHaveBeenCalledWith('services');
 *     expect(builder.eq).toHaveBeenCalledWith('business_id', 'biz-1');
 *   });
 */
export interface MockResult<T = unknown> {
  data: T;
  error: { message: string } | null;
}

const CHAINABLE_METHODS = [
  'select',
  'insert',
  'upsert',
  'update',
  'delete',
  'eq',
  'order',
  'limit',
  'single',
  'maybeSingle',
] as const;

type QueryBuilderMock = Record<(typeof CHAINABLE_METHODS)[number], ReturnType<typeof vi.fn>> & PromiseLike<MockResult>;

/**
 * Cada método de filtro (.select/.eq/.order/...) se registra como spy y
 * devuelve el mismo builder, igual que el cliente real; el builder es
 * "thenable" para que `await` en cualquier punto de la cadena resuelva al
 * resultado dado — así no importa en qué método reales termina la cadena
 * bajo prueba (`.single()`, `.maybeSingle()`, o ninguno).
 */
export function createQueryBuilderMock(result: MockResult): QueryBuilderMock {
  const builder: Record<string, unknown> = {};
  for (const method of CHAINABLE_METHODS) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: MockResult) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder as QueryBuilderMock;
}

export interface EmptySupabaseMock {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  storage: { from: ReturnType<typeof vi.fn> };
}

export function createEmptySupabaseMock(): EmptySupabaseMock {
  return {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: { from: vi.fn() },
  };
}

/** Hace que la próxima llamada a `supabase.from(...)` devuelva este resultado. */
export function mockQueryResult(supabaseMock: EmptySupabaseMock, result: MockResult): QueryBuilderMock {
  const builder = createQueryBuilderMock(result);
  supabaseMock.from.mockReturnValue(builder);
  return builder;
}

export function mockRpcResult(supabaseMock: EmptySupabaseMock, result: MockResult): void {
  supabaseMock.rpc.mockResolvedValue(result);
}

export function mockStorageResult(
  supabaseMock: EmptySupabaseMock,
  options: { uploadError?: { message: string } | null; publicUrl?: string } = {}
) {
  const upload = vi.fn().mockResolvedValue({ error: options.uploadError ?? null });
  const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: options.publicUrl ?? '' } });
  supabaseMock.storage.from.mockReturnValue({ upload, getPublicUrl });
  return { upload, getPublicUrl };
}
