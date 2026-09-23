import { writable, derived } from 'svelte/store';
import type { Tables } from '../types/database.types';

/**
 * Regla de la Fase 5 (ver plan): un store representa estado compartido, no
 * lógica de negocio. Cada uno de estos es un `writable`/`derived` puro —
 * nada aquí valida, llama a Supabase, ni decide qué pasa después. Esa
 * orquestación vive en app/src/lib/actions/, que *usa* estos stores.
 */

export type UserRole = 'admin' | 'employee';

export const currentUserId = writable<string | null>(null);
export const currentBusinessId = writable<string | null>(null);
export const currentUserRole = writable<UserRole>('admin');
export const currentBusiness = writable<Tables<'businesses'> | null>(null);

export const isAuthenticated = derived(currentUserId, ($id) => $id !== null);
export const isAdmin = derived(currentUserRole, ($role) => $role === 'admin');
export const needsOnboarding = derived(
  [isAdmin, currentBusiness],
  ([$isAdmin, $business]) => $isAdmin && !$business?.onboarding_completed
);

export function resetSession(): void {
  currentUserId.set(null);
  currentBusinessId.set(null);
  currentUserRole.set('admin');
  currentBusiness.set(null);
}
