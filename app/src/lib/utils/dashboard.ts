import { collectedRevenue } from './appointments';
import { pendingCreditTotal } from './customerAccount';
import { isSameCalendarDay, isSameCalendarMonth, isWithinCalendarWeek, getCalendarWeekRange } from './dates';
import type { Tables } from '../types/database.types';

export type DashboardPeriod = 'today' | 'week' | 'month';

export interface DateRange {
  start: Date;
  end: Date;
}

/** Rango [start, end) del período elegido, anclado a `now` -- mismo criterio de semana/mes que `calculateDashboardTotals`. */
export function getPeriodRange(period: DashboardPeriod, now: Date): DateRange {
  if (period === 'week') return getCalendarWeekRange(now);
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1) };
}

/** Una fecha cualquiera dentro del período inmediatamente anterior -- para comparar tendencias. */
export function previousPeriodReference(period: DashboardPeriod, now: Date): Date {
  if (period === 'week') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
}

/**
 * Variación porcentual entre dos totales. `null` cuando no hay base de
 * comparación válida (período anterior en cero) -- mostrar "%" ahí sería
 * engañoso (división por cero / "infinito"), así que el llamador decide
 * mostrar una insignia de "Nuevo" en su lugar.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

/** Citas no canceladas dentro del período elegido -- para el conteo de la tarjeta "Citas". */
export function appointmentsInPeriod(
  period: DashboardPeriod,
  now: Date,
  appointments: Tables<'appointments'>[]
): Tables<'appointments'>[] {
  return appointments.filter((a) => {
    if (a.status === 'cancelada') return false;
    const d = new Date(a.start_at);
    if (period === 'today') return isSameCalendarDay(d, now);
    if (period === 'week') return isWithinCalendarWeek(d, now);
    return isSameCalendarMonth(d, now);
  });
}

export interface CustomerActivity {
  newCustomers: number;
  returningCustomers: number;
}

/**
 * "Nuevos" = clientes dados de alta dentro del período. "Recurrentes" =
 * clientes con una cita en el período que YA tenían al menos una cita
 * anterior al inicio del período -- o sea, no es su primera visita.
 */
export function customerActivityInPeriod(
  period: DashboardPeriod,
  now: Date,
  appointments: Tables<'appointments'>[],
  customers: Tables<'customers'>[]
): CustomerActivity {
  const { start, end } = getPeriodRange(period, now);

  const newCustomers = customers.filter((c) => {
    if (!c.created_at) return false;
    const created = new Date(c.created_at);
    return created >= start && created < end;
  }).length;

  const active = appointments.filter((a) => {
    if (a.status === 'cancelada' || !a.customer_id) return false;
    const d = new Date(a.start_at);
    return d >= start && d < end;
  });
  const activeCustomerIds = [...new Set(active.map((a) => a.customer_id as string))];

  const returningCustomers = activeCustomerIds.filter((id) =>
    appointments.some((a) => a.customer_id === id && a.status !== 'cancelada' && new Date(a.start_at) < start)
  ).length;

  return { newCustomers, returningCustomers };
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

/**
 * Citas de un día puntual para el widget de agenda del dashboard -- excluye
 * canceladas, ordenadas por hora. Antes se llamaba `todaysAppointments`
 * porque `day` siempre era el día real; ahora también se usa con el día
 * elegido en el selector de fecha, así que el nombre ya no asumía eso.
 */
export function appointmentsForDay(day: Date, appointments: Tables<'appointments'>[]): Tables<'appointments'>[] {
  return appointments
    .filter((a) => isSameCalendarDay(new Date(a.start_at), day) && a.status !== 'cancelada')
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}
