export interface BusinessRow {
  business_id: string;
  name: string;
  email: string | null;
  plan: string | null;
  expires_at: string | null;
  status: string;
  reason: string | null;
}

export interface Db {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export const PLANS = ['mensual', 'semestral', 'anual'] as const;

export const HELP = [
  'Comandos:',
  '/vincular <código> — vincula este chat (el código se genera en la app: Configuración → Plan)',
  '/negocios — todos los negocios',
  '/estado <email>',
  '/plan <email> mensual|semestral|anual',
  '/bloquear <email> [motivo]',
  '/desbloquear <email>',
  '/pausar <email> [motivo] — congela los días restantes',
  '/reanudar <email>',
  '/vencen — vencen en los próximos 7 días',
  '',
  'Bloquear o pausar solo corta el acceso: los datos del negocio quedan guardados.',
].join('\n');

export function parseCommand(text: string): { cmd: string; args: string[] } | null {
  const parts = text.trim().split(/\s+/);
  const head = parts[0] ?? '';
  if (!head.startsWith('/')) return null;
  return { cmd: head.slice(1).split('@')[0].toLowerCase(), args: parts.slice(1) };
}

export function fmtDay(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '—';
}

export function formatBusiness(b: BusinessRow): string {
  const lines = [
    `${b.name} <${b.email ?? 'sin email'}>`,
    `Plan: ${b.plan ?? '—'} · Estado: ${b.status} · Vence: ${fmtDay(b.expires_at)}`,
  ];
  if (b.reason) lines.push(`Motivo: ${b.reason}`);
  return lines.join('\n');
}

export function expiringWithin(rows: BusinessRow[], days: number, now: Date): BusinessRow[] {
  const limit = now.getTime() + days * 86_400_000;
  return rows.filter((b) => {
    if (!b.expires_at || b.status === 'bloqueado' || b.status === 'pausado') return false;
    const t = new Date(b.expires_at).getTime();
    return t > now.getTime() && t <= limit;
  });
}

async function call(db: Db, fn: string, args?: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

async function listBusinesses(db: Db): Promise<BusinessRow[]> {
  return ((await call(db, 'admin_list_businesses')) as BusinessRow[] | null) ?? [];
}

async function findByEmail(db: Db, email: string | undefined): Promise<BusinessRow | string> {
  if (!email || !email.includes('@')) return 'Falta el email del negocio.';
  const target = email.toLowerCase();
  const found = (await listBusinesses(db)).find((b) => b.email?.toLowerCase() === target);
  return found ?? `No hay ningún negocio con el email ${email}.`;
}

async function statusOf(db: Db, id: string): Promise<string> {
  const b = (await listBusinesses(db)).find((r) => r.business_id === id);
  return b ? formatBusiness(b) : '';
}

/**
 * Punto de entrada de cada mensaje. `/vincular` lo puede usar cualquier
 * chat (el código de un solo uso es la prueba de identidad); el resto
 * solo un chat vinculado a un súper admin. Para chats ajenos devuelve
 * null: el webhook no responde nada.
 */
export async function handleUpdate(db: Db, chatId: number, text: string, now: Date = new Date()): Promise<string | null> {
  const parsed = parseCommand(text);
  if (parsed?.cmd === 'vincular') {
    if (!parsed.args[0]) return 'Uso: /vincular <código>';
    const { data, error } = await db.rpc('admin_link_telegram', { p_code: parsed.args[0], p_chat_id: chatId });
    if (error) return 'Código inválido o vencido. Genera uno nuevo en la app (Configuración → Plan).';
    return `Vinculado como súper admin: ${data}\n\n${HELP}`;
  }

  const { data: isAdmin, error } = await db.rpc('admin_chat_is_super_admin', { p_chat_id: chatId });
  if (error || isAdmin !== true) return null;
  return handleCommand(db, text, now);
}

export async function handleCommand(db: Db, text: string, now: Date = new Date()): Promise<string> {
  const parsed = parseCommand(text);
  if (!parsed) return HELP;
  const { cmd, args } = parsed;

  try {
    switch (cmd) {
      case 'start':
      case 'ayuda':
      case 'help':
        return HELP;

      case 'negocios': {
        const rows = await listBusinesses(db);
        return rows.length ? rows.map(formatBusiness).join('\n\n') : 'No hay negocios registrados.';
      }

      case 'vencen': {
        const rows = expiringWithin(await listBusinesses(db), 7, now);
        return rows.length ? rows.map(formatBusiness).join('\n\n') : 'Ningún plan vence en los próximos 7 días.';
      }

      case 'estado': {
        const b = await findByEmail(db, args[0]);
        return typeof b === 'string' ? b : formatBusiness(b);
      }

      case 'plan': {
        const plan = (args[1] ?? '').toLowerCase();
        if (!(PLANS as readonly string[]).includes(plan)) return 'Uso: /plan <email> mensual|semestral|anual';
        const b = await findByEmail(db, args[0]);
        if (typeof b === 'string') return b;
        await call(db, 'admin_set_plan', { p_business_id: b.business_id, p_plan: plan });
        return `Plan asignado.\n${await statusOf(db, b.business_id)}`;
      }

      case 'bloquear':
      case 'pausar': {
        const b = await findByEmail(db, args[0]);
        if (typeof b === 'string') return b;
        const reason = args.slice(1).join(' ') || null;
        const fn = cmd === 'bloquear' ? 'admin_block_business' : 'admin_pause_business';
        await call(db, fn, { p_business_id: b.business_id, p_reason: reason });
        const verb = cmd === 'bloquear' ? 'Bloqueado' : 'Pausado';
        return `${verb}. Sus datos quedan guardados.\n${await statusOf(db, b.business_id)}`;
      }

      case 'desbloquear':
      case 'reanudar': {
        const b = await findByEmail(db, args[0]);
        if (typeof b === 'string') return b;
        const fn = cmd === 'desbloquear' ? 'admin_unblock_business' : 'admin_resume_business';
        await call(db, fn, { p_business_id: b.business_id });
        const verb = cmd === 'desbloquear' ? 'Desbloqueado' : 'Reanudado';
        return `${verb}.\n${await statusOf(db, b.business_id)}`;
      }

      default:
        return `Comando desconocido: /${cmd}\n\n${HELP}`;
    }
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
