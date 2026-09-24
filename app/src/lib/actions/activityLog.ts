import { listActivityLog as apiListActivityLog } from '../api/activityLog';
import type { Tables } from '../types/database.types';

/** Sin store propio -- solo lo consume la pestaña de Registro de Actividad. */
export async function loadActivityLog(businessId: string): Promise<Tables<'activity_log'>[]> {
  return apiListActivityLog(businessId);
}
