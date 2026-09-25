import { chooseTrialPlan, getMyBusinessAccess } from '../api/businessAccess';
import { businessAccess } from '../stores/session';
import type { PaidPlan } from '../types/businessAccess';

/** Activa la prueba del plan elegido y refresca el acceso para que la UI muestre el nuevo vencimiento. */
export async function startPlanTrial(plan: PaidPlan): Promise<void> {
  await chooseTrialPlan(plan);
  businessAccess.set(await getMyBusinessAccess());
}
