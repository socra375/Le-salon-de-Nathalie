import type { Tables } from '../types/database.types';
import { apptServiceIds, collectedRevenue } from './appointments';

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

export interface MonthlySpending {
  /** Clave ordenable "YYYY-MM", no mostrada -- la etiqueta la arma el llamador con el locale activo. */
  monthKey: string;
  year: number;
  month: number;
  total: number;
  visitCount: number;
  /** Citas completadas de ese mes que todavía no tienen factura -- para el acceso rápido a facturar. */
  pendingInvoice: Tables<'appointments'>[];
}

/**
 * Agrupa por mes calendario las citas completadas del cliente (el informe
 * de gastos de su cuenta) -- en vivo a partir del historial ya cargado, sin
 * ningún proceso ni tabla que "cierre" el mes por separado. Solo cuenta lo
 * ya cobrado (`collectedRevenue`), igual que el resto de los reportes de la
 * app: una cita a crédito sin abonar no suma hasta que se pague.
 */
export function monthlySpendingSummary(
  history: Tables<'appointments'>[],
  services: Tables<'services'>[],
  invoices: Tables<'invoices'>[],
  credits: Tables<'customer_credits'>[]
): MonthlySpending[] {
  const invoicedIds = new Set(invoices.filter((inv) => inv.appointment_id).map((inv) => inv.appointment_id as string));
  const byMonth = new Map<string, MonthlySpending>();

  for (const appt of history) {
    if (appt.status !== 'completada') continue;
    const date = new Date(appt.start_at);
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    let entry = byMonth.get(monthKey);
    if (!entry) {
      entry = { monthKey, year, month, total: 0, visitCount: 0, pendingInvoice: [] };
      byMonth.set(monthKey, entry);
    }
    entry.total += collectedRevenue(appt, services, invoices, credits);
    entry.visitCount += 1;
    if (!invoicedIds.has(appt.id)) entry.pendingInvoice.push(appt);
  }

  return [...byMonth.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
