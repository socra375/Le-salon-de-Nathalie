export type BusinessAccessStatus = 'new' | 'trial' | 'active' | 'expired' | 'paused' | 'blocked';
export type BusinessPlan = 'prueba' | 'mensual' | 'semestral' | 'anual';

export interface BusinessAccess {
  status: BusinessAccessStatus;
  plan: BusinessPlan | null;
  expires_at: string | null;
  reason: string | null;
  is_super_admin: boolean;
}

export const LOCKED_STATUSES: readonly BusinessAccessStatus[] = ['expired', 'paused', 'blocked'];
