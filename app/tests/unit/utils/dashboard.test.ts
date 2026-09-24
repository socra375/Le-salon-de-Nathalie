import { describe, expect, it } from 'vitest';
import {
  calculateDashboardTotals,
  appointmentsForDay,
  getPeriodRange,
  previousPeriodReference,
  percentChange,
  appointmentsInPeriod,
  customerActivityInPeriod,
  last7DaysRevenue,
} from '../../../src/lib/utils/dashboard';
import type { Tables } from '../../../src/lib/types/database.types';

const services: Tables<'services'>[] = [
  { id: 'svc-1', business_id: 'biz-1', name: 'Corte', category: null, duration_minutes: 30, price: 500, active: true, created_at: null },
];

function makeAppt(overrides: Partial<Tables<'appointments'>>): Tables<'appointments'> {
  return {
    id: 'a1',
    business_id: 'biz-1',
    customer_id: null,
    employee_id: 'biz-1',
    service_id: 'svc-1',
    service_ids: null,
    start_at: '2026-01-15T10:00:00.000Z',
    end_at: '2026-01-15T10:30:00.000Z',
    status: 'completada',
    price: 500,
    notes: null,
    created_at: null,
    ...overrides,
  };
}

const now = new Date('2026-01-15T18:00:00.000Z'); // jueves

describe('calculateDashboardTotals', () => {
  it('"today": solo cuenta citas completadas de hoy', () => {
    const today = makeAppt({ id: 'today', start_at: '2026-01-15T09:00:00.000Z', price: 500 });
    const yesterday = makeAppt({ id: 'yesterday', start_at: '2026-01-14T09:00:00.000Z', price: 500 });
    const totals = calculateDashboardTotals(now, 'today', [today, yesterday], services, [], []);
    expect(totals.netProfit).toBe(500);
  });

  it('ignora citas no completadas aunque sean de hoy', () => {
    const pending = makeAppt({ id: 'p1', status: 'pendiente', start_at: '2026-01-15T09:00:00.000Z' });
    const totals = calculateDashboardTotals(now, 'today', [pending], services, [], []);
    expect(totals.netProfit).toBe(0);
  });

  it('"week": la semana calendario (lunes-domingo), no una ventana móvil de 7 días', () => {
    const mondayThisWeek = makeAppt({ id: 'mon', start_at: '2026-01-12T09:00:00.000Z' });
    const sundayLastWeek = makeAppt({ id: 'sunLast', start_at: '2026-01-11T09:00:00.000Z' });
    const totals = calculateDashboardTotals(now, 'week', [mondayThisWeek, sundayLastWeek], services, [], []);
    expect(totals.netProfit).toBe(500);
  });

  it('"month": mismo mes y año que la fecha de referencia', () => {
    const sameMonth = makeAppt({ id: 'm1', start_at: '2026-01-02T09:00:00.000Z' });
    const otherMonth = makeAppt({ id: 'm2', start_at: '2025-12-30T09:00:00.000Z' });
    const totals = calculateDashboardTotals(now, 'month', [sameMonth, otherMonth], services, [], []);
    expect(totals.netProfit).toBe(500);
  });

  it('las cuentas por cobrar son un total aparte, no filtrado por período', () => {
    const credits: Tables<'customer_credits'>[] = [
      { id: 'c1', business_id: 'biz-1', customer_id: 'cust-1', sale_id: null, invoice_id: null, amount: 300, amount_paid: 100, status: 'parcial', created_at: null },
    ];
    const totals = calculateDashboardTotals(now, 'today', [], services, [], credits);
    expect(totals.totalReceivables).toBe(200);
  });
});

describe('appointmentsForDay', () => {
  it('excluye las canceladas y ordena por hora', () => {
    const late = makeAppt({ id: 'late', start_at: '2026-01-15T16:00:00.000Z', status: 'pendiente' });
    const early = makeAppt({ id: 'early', start_at: '2026-01-15T09:00:00.000Z', status: 'confirmada' });
    const cancelled = makeAppt({ id: 'cancelled', start_at: '2026-01-15T08:00:00.000Z', status: 'cancelada' });
    const result = appointmentsForDay(now, [late, early, cancelled]);
    expect(result.map((a) => a.id)).toEqual(['early', 'late']);
  });

  it('no incluye citas de otro día', () => {
    const yesterday = makeAppt({ id: 'y', start_at: '2026-01-14T09:00:00.000Z' });
    expect(appointmentsForDay(now, [yesterday])).toEqual([]);
  });

  it('funciona con cualquier día, no solo "hoy" -- el selector de fecha del dashboard lo usa así', () => {
    const picked = makeAppt({ id: 'picked', start_at: '2026-01-10T09:00:00.000Z' });
    const otherDay = makeAppt({ id: 'other', start_at: '2026-01-11T09:00:00.000Z' });
    const result = appointmentsForDay(new Date('2026-01-10T12:00:00.000Z'), [picked, otherDay]);
    expect(result.map((a) => a.id)).toEqual(['picked']);
  });
});

describe('getPeriodRange', () => {
  it('"today": el día calendario de la fecha de referencia', () => {
    const { start, end } = getPeriodRange('today', now);
    expect(start.toISOString()).toBe(new Date(2026, 0, 15).toISOString());
    expect(end.toISOString()).toBe(new Date(2026, 0, 16).toISOString());
  });

  it('"month": el mes calendario completo', () => {
    const { start, end } = getPeriodRange('month', now);
    expect(start.toISOString()).toBe(new Date(2026, 0, 1).toISOString());
    expect(end.toISOString()).toBe(new Date(2026, 1, 1).toISOString());
  });
});

describe('previousPeriodReference', () => {
  it('"today": el día anterior', () => {
    const prev = previousPeriodReference('today', new Date(2026, 0, 15));
    expect(prev.toDateString()).toBe(new Date(2026, 0, 14).toDateString());
  });

  it('"month": cae dentro del mes anterior', () => {
    const prev = previousPeriodReference('month', new Date(2026, 0, 15));
    expect(prev.getMonth()).toBe(11);
    expect(prev.getFullYear()).toBe(2025);
  });
});

describe('percentChange', () => {
  it('calcula el porcentaje normal', () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(80, 100)).toBe(-20);
  });

  it('sin base de comparación (anterior en 0) y algo actual, devuelve null', () => {
    expect(percentChange(50, 0)).toBeNull();
  });

  it('ambos en 0, devuelve 0 (no null)', () => {
    expect(percentChange(0, 0)).toBe(0);
  });
});

describe('appointmentsInPeriod', () => {
  it('cuenta solo las no canceladas del período', () => {
    const inPeriod = makeAppt({ id: 'a', start_at: '2026-01-15T09:00:00.000Z', status: 'confirmada' });
    const cancelled = makeAppt({ id: 'b', start_at: '2026-01-15T09:00:00.000Z', status: 'cancelada' });
    const outside = makeAppt({ id: 'c', start_at: '2026-01-14T09:00:00.000Z', status: 'confirmada' });
    const result = appointmentsInPeriod('today', now, [inPeriod, cancelled, outside]);
    expect(result.map((a) => a.id)).toEqual(['a']);
  });
});

describe('customerActivityInPeriod', () => {
  const customers: Tables<'customers'>[] = [
    { id: 'cust-new', business_id: 'biz-1', name: 'Nueva', phone: null, notes: null, created_at: '2026-01-15T08:00:00.000Z' },
    { id: 'cust-old', business_id: 'biz-1', name: 'Vieja', phone: null, notes: null, created_at: '2025-01-01T08:00:00.000Z' },
  ] as never;

  it('cuenta clientes nuevos dados de alta en el período', () => {
    const result = customerActivityInPeriod('today', now, [], customers);
    expect(result.newCustomers).toBe(1);
  });

  it('cuenta como recurrente a quien ya tenía una cita antes del período', () => {
    const before = makeAppt({ id: 'before', customer_id: 'cust-old', start_at: '2026-01-01T09:00:00.000Z' });
    const inPeriod = makeAppt({ id: 'in', customer_id: 'cust-old', start_at: '2026-01-15T09:00:00.000Z' });
    const result = customerActivityInPeriod('today', now, [before, inPeriod], customers);
    expect(result.returningCustomers).toBe(1);
  });

  it('no cuenta como recurrente a alguien sin cita previa al período', () => {
    const onlyToday = makeAppt({ id: 'only', customer_id: 'cust-new', start_at: '2026-01-15T09:00:00.000Z' });
    const result = customerActivityInPeriod('today', now, [onlyToday], customers);
    expect(result.returningCustomers).toBe(0);
  });
});

describe('last7DaysRevenue', () => {
  it('devuelve 7 puntos terminando en la fecha de referencia, con el ingreso cobrado de cada día', () => {
    const today = makeAppt({ id: 'today', start_at: '2026-01-15T09:00:00.000Z', status: 'completada', price: 500 });
    const points = last7DaysRevenue(now, [today], services, [], []);
    expect(points).toHaveLength(7);
    expect(points[6]?.date.toDateString()).toBe(new Date(2026, 0, 15).toDateString());
    expect(points[6]?.amount).toBe(500);
    expect(points[0]?.amount).toBe(0);
  });
});
