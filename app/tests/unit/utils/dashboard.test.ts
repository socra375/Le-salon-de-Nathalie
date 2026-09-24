import { describe, expect, it } from 'vitest';
import { calculateDashboardTotals, todaysAppointments } from '../../../src/lib/utils/dashboard';
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

describe('todaysAppointments', () => {
  it('excluye las canceladas y ordena por hora', () => {
    const late = makeAppt({ id: 'late', start_at: '2026-01-15T16:00:00.000Z', status: 'pendiente' });
    const early = makeAppt({ id: 'early', start_at: '2026-01-15T09:00:00.000Z', status: 'confirmada' });
    const cancelled = makeAppt({ id: 'cancelled', start_at: '2026-01-15T08:00:00.000Z', status: 'cancelada' });
    const result = todaysAppointments(now, [late, early, cancelled]);
    expect(result.map((a) => a.id)).toEqual(['early', 'late']);
  });

  it('no incluye citas de otro día', () => {
    const yesterday = makeAppt({ id: 'y', start_at: '2026-01-14T09:00:00.000Z' });
    expect(todaysAppointments(now, [yesterday])).toEqual([]);
  });
});
