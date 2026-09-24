import { collectedRevenue } from './appointments';
import { pendingCreditTotal } from './customerAccount';
import { isSameCalendarDay, isSameCalendarMonth, isWithinCalendarWeek } from './dates';
import type { Tables } from '../types/database.types';

export type DashboardPeriod = 'today' | 'week' | 'month';

export interface DashboardTotals {
  netProfit: number;
  totalReceivables: number;
}

/**
 * Mismo cálculo que `calculateFinancialDashboard` del legado: el ingreso
 * neto solo cuenta citas completadas dentro del período elegido, usando
 * `collectedRevenue` (lo a crédito no cuenta hasta que se abona); las
 * cuentas por cobrar son un total aparte, no filtrado por período.
 */
export function calculateDashboardTotals(
  now: Date,
  period: DashboardPeriod,
  appointments: Tables<'appointments'>[],
  services: Tables<'services'>[],
  invoices: Tables<'invoices'>[],
  credits: Tables<'customer_credits'>[]
): DashboardTotals {
  const completed = appointments.filter((a) => a.status === 'completada');
  const filtered = completed.filter((a) => {
    const d = new Date(a.start_at);
    if (period === 'today') return isSameCalendarDay(d, now);
    if (period === 'week') return isWithinCalendarWeek(d, now);
    return isSameCalendarMonth(d, now);
  });

  const netProfit = filtered.reduce((acc, a) => acc + collectedRevenue(a, services, invoices, credits), 0);
  const totalReceivables = pendingCreditTotal(credits);

  return { netProfit, totalReceivables };
}

/** Citas de hoy para el widget del dashboard -- excluye canceladas, ordenadas por hora. */
export function todaysAppointments(now: Date, appointments: Tables<'appointments'>[]): Tables<'appointments'>[] {
  return appointments
    .filter((a) => isSameCalendarDay(new Date(a.start_at), now) && a.status !== 'cancelada')
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

export interface DailyRevenuePoint {
  date: Date;
  amount: number;
}

/** Ingresos cobrados de cada uno de los últimos 7 días (incluyendo `now`), para el gráfico de actividad. */
export function last7DaysRevenue(
  now: Date,
  appointments: Tables<'appointments'>[],
  services: Tables<'services'>[],
  invoices: Tables<'invoices'>[],
  credits: Tables<'customer_credits'>[]
): DailyRevenuePoint[] {
  const completed = appointments.filter((a) => a.status === 'completada');
  const points: DailyRevenuePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const amount = completed
      .filter((a) => isSameCalendarDay(new Date(a.start_at), date))
      .reduce((acc, a) => acc + collectedRevenue(a, services, invoices, credits), 0);
    points.push({ date, amount });
  }
  return points;
}
