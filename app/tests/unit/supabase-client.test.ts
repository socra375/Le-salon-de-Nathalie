import { describe, expect, it, vi, beforeEach } from 'vitest';

// El módulo lanza en el nivel superior si faltan las variables de entorno,
// así que cada caso necesita reimportarlo desde cero con vi.resetModules().
describe('src/lib/supabase/client.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('lanza un error claro si faltan las variables de entorno', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    await expect(import('../../src/lib/supabase/client')).rejects.toThrow(/VITE_SUPABASE_URL/);
  });

  it('crea el cliente cuando las variables de entorno están presentes', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://ejemplo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'clave-de-prueba');

    const { supabase } = await import('../../src/lib/supabase/client');
    expect(typeof supabase.from).toBe('function');
  });
});
