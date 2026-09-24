import { describe, expect, it } from 'vitest';
import { summarizeCustomerHistory, pendingCreditTotal, receivablesByCustomer } from '../../../src/lib/utils/customerAccount';
import type { Tables } from '../../../src/lib/types/database.types';

function appt(overrides: Partial<Tables<'appointments'>>): Tables<'appointments'> {
  return {
    id: 'a1',
    business_id: 'biz-1',
    customer_id: 'cust-1',
    employee_id: 'emp-1',
    service_id: 'svc-1',
    service_ids: null,
    start_at: '2026-01-01T10:00:00Z',
    end_at: '2026-01-01T10:30:00Z',
    status: 'completada',
    price: null,
    notes: null,
    created_at: null,
    ...overrides,
  };
}

describe('summarizeCustomerHistory', () => {
  it('sin historial, todo queda en null', () => {
    expect(summarizeCustomerHistory([])).toEqual({ lastVisitAt: null, topServiceId: null, topSpecialistId: null });
  });

  it('la última visita prioriza la cita completada más reciente sobre una posterior cancelada', () => {
    const history = [
      appt({ id: 'a2', start_at: '2026-02-01T10:00:00Z', status: 'cancelada' }),
      appt({ id: 'a1', start_at: '2026-01-01T10:00:00Z', status: 'completada' }),
    ];
    expect(summarizeCustomerHistory(history).lastVisitAt).toBe('2026-01-01T10:00:00Z');
  });

  it('si nunca hubo una cita completada, cae a la primera del arreglo (ya viene ordenado por el llamador)', () => {
    const history = [appt({ id: 'a1', start_at: '2026-02-01T10:00:00Z', status: 'pendiente' })];
    expect(summarizeCustomerHistory(history).lastVisitAt).toBe('2026-02-01T10:00:00Z');
  });

  it('el servicio y especialista más frecuentes se cuentan por apariciones', () => {
    const history = [
      appt({ id: 'a1', service_id: 'svc-1', employee_id: 'emp-1' }),
      appt({ id: 'a2', service_id: 'svc-1', employee_id: 'emp-2' }),
      appt({ id: 'a3', service_id: 'svc-2', employee_id: 'emp-2' }),
    ];
    const summary = summarizeCustomerHistory(history);
    expect(summary.topServiceId).toBe('svc-1');
    expect(summary.topSpecialistId).toBe('emp-2');
  });

  it('cuenta cada servicio de una cita con varios servicios (service_ids)', () => {
    const history = [
      appt({ id: 'a1', service_id: 'svc-1', service_ids: ['svc-2', 'svc-3'] }),
      appt({ id: 'a2', service_id: 'svc-2' }),
    ];
    expect(summarizeCustomerHistory(history).topServiceId).toBe('svc-2');
  });
});

describe('pendingCreditTotal', () => {
  function credit(overrides: Partial<Tables<'customer_credits'>>): Tables<'customer_credits'> {
    return {
      id: 'cr-1',
      business_id: 'biz-1',
      customer_id: 'cust-1',
      sale_id: null,
      invoice_id: null,
      amount: 100,
      amount_paid: 0,
      status: 'pendiente',
      created_at: null,
      ...overrides,
    };
  }

  it('suma lo que falta cobrar de los créditos no pagados', () => {
    const credits = [
      credit({ id: 'cr-1', amount: 100, amount_paid: 40, status: 'parcial' }),
      credit({ id: 'cr-2', amount: 50, amount_paid: 0, status: 'pendiente' }),
      credit({ id: 'cr-3', amount: 30, amount_paid: 30, status: 'pagado' }),
    ];
    expect(pendingCreditTotal(credits)).toBe(110);
  });

  it('sin créditos pendientes, el total es cero', () => {
    expect(pendingCreditTotal([credit({ status: 'pagado', amount_paid: 100 })])).toBe(0);
  });
});

describe('receivablesByCustomer', () => {
  function credit(overrides: Partial<Tables<'customer_credits'>>): Tables<'customer_credits'> {
    return {
      id: 'cr-1',
      business_id: 'biz-1',
      customer_id: 'cust-1',
      sale_id: null,
      invoice_id: null,
      amount: 100,
      amount_paid: 0,
      status: 'pendiente',
      created_at: null,
      ...overrides,
    };
  }

  const customers: Tables<'customers'>[] = [
    { id: 'cust-1', business_id: 'biz-1', name: 'Carmen Lugo', phone: null, notes: null, address: null, email: null, created_at: null },
    { id: 'cust-2', business_id: 'biz-1', name: 'Rosa Martínez', phone: null, notes: null, address: null, email: null, created_at: null },
  ];

  it('agrupa el saldo pendiente por cliente y ordena de mayor a menor', () => {
    const credits = [
      credit({ id: 'cr-1', customer_id: 'cust-1', amount: 100, amount_paid: 0 }),
      credit({ id: 'cr-2', customer_id: 'cust-2', amount: 450, amount_paid: 0 }),
      credit({ id: 'cr-3', customer_id: 'cust-1', amount: 50, amount_paid: 0 }),
    ];
    expect(receivablesByCustomer(credits, customers)).toEqual([
      { customerId: 'cust-2', name: 'Rosa Martínez', amount: 450 },
      { customerId: 'cust-1', name: 'Carmen Lugo', amount: 150 },
    ]);
  });

  it('ignora créditos sin cliente asociado (venta anónima)', () => {
    const credits = [credit({ id: 'cr-1', customer_id: null, amount: 100, amount_paid: 0 })];
    expect(receivablesByCustomer(credits, customers)).toEqual([]);
  });

  it('excluye clientes ya saldados por completo', () => {
    const credits = [credit({ id: 'cr-1', customer_id: 'cust-1', amount: 100, amount_paid: 100, status: 'pagado' })];
    expect(receivablesByCustomer(credits, customers)).toEqual([]);
  });
});
