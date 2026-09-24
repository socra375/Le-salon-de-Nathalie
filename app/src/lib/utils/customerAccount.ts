import type { Tables } from '../types/database.types';
import { apptServiceIds } from './appointments';

export interface CustomerAccountSummary {
  lastVisitAt: string | null;
  topServiceId: string | null;
  topSpecialistId: string | null;
}

/**
 * Igual que `openCustomerAccountModal` del legado: la "última visita"
 * prioriza la cita completada más reciente (si nunca se completó
 * ninguna, cae a la más reciente del historial, sin importar su
 * estado); "más frecuente" es un conteo simple por id, no un promedio
 * ponderado por fecha.
 */
export function summarizeCustomerHistory(
  history: Tables<'appointments'>[]
): CustomerAccountSummary {
  const lastVisit = history.find((a) => a.status === 'completada') ?? history[0] ?? null;

  const serviceCounts = new Map<string, number>();
  const specialistCounts = new Map<string, number>();
  history.forEach((appt) => {
    apptServiceIds(appt).forEach((id) => serviceCounts.set(id, (serviceCounts.get(id) ?? 0) + 1));
    specialistCounts.set(appt.employee_id, (specialistCounts.get(appt.employee_id) ?? 0) + 1);
  });

  const topServiceId = [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topSpecialistId = [...specialistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { lastVisitAt: lastVisit?.start_at ?? null, topServiceId, topSpecialistId };
}

/** Suma lo que falta cobrar de los créditos aún no pagados del cliente. */
export function pendingCreditTotal(credits: Tables<'customer_credits'>[]): number {
  return credits
    .filter((c) => c.status !== 'pagado')
    .reduce((acc, c) => acc + (Number(c.amount) - Number(c.amount_paid)), 0);
}

export interface CustomerReceivable {
  customerId: string;
  name: string;
  amount: number;
}

/**
 * Desglosa las cuentas por cobrar por cliente, de mayor a menor saldo --
 * para la tarjeta "Por cobrar" del dashboard. Créditos sin `customer_id`
 * (venta anónima) se ignoran: no hay a quién cobrarle.
 */
export function receivablesByCustomer(
  credits: Tables<'customer_credits'>[],
  customers: Tables<'customers'>[]
): CustomerReceivable[] {
  const byCustomer = new Map<string, Tables<'customer_credits'>[]>();
  for (const credit of credits) {
    if (!credit.customer_id) continue;
    const list = byCustomer.get(credit.customer_id) ?? [];
    list.push(credit);
    byCustomer.set(credit.customer_id, list);
  }

  const names = new Map(customers.map((c) => [c.id, c.name]));

  return [...byCustomer.entries()]
    .map(([customerId, list]) => ({ customerId, name: names.get(customerId) ?? '', amount: pendingCreditTotal(list) }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}
