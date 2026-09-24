import { supabase } from '../api/client';

export interface AccountInfo {
  avatarUrl: string;
  name: string;
  email: string;
}

/** Datos de perfil del usuario autenticado (Google/metadata de Auth), no de `businesses`. */
export async function getAccountInfo(): Promise<AccountInfo> {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const meta = (user?.user_metadata as Record<string, string> | undefined) || {};
  return {
    avatarUrl: meta.avatar_url || meta.picture || '',
    name: meta.full_name || meta.name || '',
    email: user?.email || '',
  };
}
