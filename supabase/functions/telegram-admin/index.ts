// Webhook del bot de Telegram de administración (uso exclusivo del dueño
// del SaaS). Se despliega con verify_jwt = false porque Telegram no manda
// JWT: la autenticación es el secret_token del webhook + el chat_id.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleCommand } from './commands.ts';

const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? '';
const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // Sin secretos configurados el bot no responde a nadie.
  const secret = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!WEBHOOK_SECRET || !ADMIN_CHAT_ID || !safeEqual(secret, WEBHOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let update: { message?: { chat?: { id?: number }; text?: string } };
  try {
    update = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text;
  // Chats ajenos: 200 vacío para que Telegram no reintente y no revelar nada.
  if (chatId === undefined || String(chatId) !== ADMIN_CHAT_ID || !text) {
    return new Response(null, { status: 200 });
  }

  const reply = await handleCommand(db, text);
  // Respuesta directa en el cuerpo del webhook: no hace falta el token del bot.
  return new Response(JSON.stringify({ method: 'sendMessage', chat_id: chatId, text: reply }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
