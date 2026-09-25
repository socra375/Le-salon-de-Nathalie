import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { type BusinessRow, type Db, expiringWithin, handleCommand, handleUpdate, parseCommand } from './commands.ts';

const NATH: BusinessRow = {
  business_id: 'b1',
  name: 'Nathalie',
  email: 'nath1105@hotmail.ca',
  plan: 'prueba',
  expires_at: '2026-10-02T00:00:00Z',
  status: 'prueba',
  reason: null,
};

function fakeDb(rows: BusinessRow[] = [NATH]) {
  const calls: { fn: string; args?: Record<string, unknown> }[] = [];
  const db: Db = {
    rpc(fn, args) {
      calls.push({ fn, args });
      if (fn === 'admin_list_businesses') return Promise.resolve({ data: rows, error: null });
      return Promise.resolve({ data: null, error: null });
    },
  };
  return { db, calls };
}

Deno.test('parseCommand quita la mención @bot y normaliza', () => {
  assertEquals(parseCommand('/Plan@MiBot a@b.c anual'), { cmd: 'plan', args: ['a@b.c', 'anual'] });
  assertEquals(parseCommand('hola'), null);
});

Deno.test('/plan busca por email sin importar mayúsculas y llama admin_set_plan', async () => {
  const { db, calls } = fakeDb();
  const out = await handleCommand(db, '/plan NATH1105@hotmail.ca Anual');
  assertStringIncludes(out, 'Plan asignado');
  assertEquals(calls.find((c) => c.fn === 'admin_set_plan')?.args, { p_business_id: 'b1', p_plan: 'anual' });
});

Deno.test('/plan con plan inválido no toca la base', async () => {
  const { db, calls } = fakeDb();
  const out = await handleCommand(db, '/plan nath1105@hotmail.ca trimestral');
  assertStringIncludes(out, 'Uso:');
  assertEquals(calls.length, 0);
});

Deno.test('/bloquear pasa el motivo completo y avisa que los datos quedan guardados', async () => {
  const { db, calls } = fakeDb();
  const out = await handleCommand(db, '/bloquear nath1105@hotmail.ca pago pendiente');
  assertStringIncludes(out, 'datos quedan guardados');
  assertEquals(calls.find((c) => c.fn === 'admin_block_business')?.args, {
    p_business_id: 'b1',
    p_reason: 'pago pendiente',
  });
});

Deno.test('/reanudar usa admin_resume_business', async () => {
  const { db, calls } = fakeDb();
  await handleCommand(db, '/reanudar nath1105@hotmail.ca');
  assert(calls.some((c) => c.fn === 'admin_resume_business'));
});

Deno.test('email desconocido responde sin llamar funciones de escritura', async () => {
  const { db, calls } = fakeDb();
  const out = await handleCommand(db, '/pausar nadie@x.com');
  assertStringIncludes(out, 'No hay ningún negocio');
  assertEquals(calls.map((c) => c.fn), ['admin_list_businesses']);
});

Deno.test('errores de la base se devuelven como texto, no revientan el webhook', async () => {
  const { db } = fakeDb();
  const failing: Db = { rpc: () => Promise.resolve({ data: null, error: { message: 'boom' } }) };
  assertStringIncludes(await handleCommand(failing, '/negocios'), 'Error: boom');
  assertStringIncludes(await handleCommand(db, '/desconocido'), 'Comando desconocido');
});

Deno.test('expiringWithin ignora vencidos, bloqueados, pausados y lejanos', () => {
  const now = new Date('2026-09-25T00:00:00Z');
  const rows: BusinessRow[] = [
    { ...NATH, business_id: 'soon', expires_at: '2026-09-30T00:00:00Z' },
    { ...NATH, business_id: 'far', expires_at: '2027-09-25T00:00:00Z' },
    { ...NATH, business_id: 'past', expires_at: '2026-09-20T00:00:00Z' },
    { ...NATH, business_id: 'paused', status: 'pausado', expires_at: '2026-09-30T00:00:00Z' },
  ];
  assertEquals(expiringWithin(rows, 7, now).map((r) => r.business_id), ['soon']);
});

function authDb(adminChat: number, validCode = 'ABC123DEF0') {
  const calls: string[] = [];
  const db: Db = {
    rpc(fn, args) {
      calls.push(fn);
      if (fn === 'admin_chat_is_super_admin') return Promise.resolve({ data: args?.p_chat_id === adminChat, error: null });
      if (fn === 'admin_link_telegram') {
        return Promise.resolve(
          args?.p_code === validCode
            ? { data: 'marcos@example.com', error: null }
            : { data: null, error: { message: 'Código inválido o vencido' } },
        );
      }
      if (fn === 'admin_list_businesses') return Promise.resolve({ data: [NATH], error: null });
      return Promise.resolve({ data: null, error: null });
    },
  };
  return { db, calls };
}

Deno.test('handleUpdate: un chat ajeno no recibe respuesta ni ejecuta comandos', async () => {
  const { db, calls } = authDb(111);
  assertEquals(await handleUpdate(db, 999, '/negocios'), null);
  assertEquals(calls, ['admin_chat_is_super_admin']);
});

Deno.test('handleUpdate: el súper admin vinculado ejecuta comandos', async () => {
  const { db } = authDb(111);
  assertStringIncludes((await handleUpdate(db, 111, '/negocios')) ?? '', 'Nathalie');
});

Deno.test('handleUpdate: /vincular con código válido vincula y muestra la ayuda', async () => {
  const { db } = authDb(111);
  const out = (await handleUpdate(db, 999, '/vincular ABC123DEF0')) ?? '';
  assertStringIncludes(out, 'Vinculado como súper admin: marcos@example.com');
  assertStringIncludes(out, '/negocios');
});

Deno.test('handleUpdate: /vincular con código inválido o sin código', async () => {
  const { db } = authDb(111);
  assertStringIncludes((await handleUpdate(db, 999, '/vincular NOPE')) ?? '', 'Código inválido o vencido');
  assertStringIncludes((await handleUpdate(db, 999, '/vincular')) ?? '', 'Uso: /vincular');
});
