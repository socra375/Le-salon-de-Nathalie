export type BusinessAccessStatus = 'new' | 'trial' | 'active' | 'expired' | 'paused' | 'blocked';
export type BusinessPlan = 'prueba' | 'mensual' | 'semestral' | 'anual';
/** Módulos que el súper admin puede apagar por negocio (según la landing). */
export type ModuleKey = 'facturas' | 'equipo' | 'estadisticas';
export const ALL_MODULES: readonly ModuleKey[] = ['facturas', 'equipo', 'estadisticas'];

export interface BusinessAccess {
  status: BusinessAccessStatus;
  plan: BusinessPlan | null;
  expires_at: string | null;
  reason: string | null;
  is_super_admin: boolean;
  modules: ModuleKey[];
}

export const LOCKED_STATUSES: readonly BusinessAccessStatus[] = ['expired', 'paused', 'blocked'];
