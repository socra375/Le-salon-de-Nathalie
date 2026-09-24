import { describe, expect, it } from 'vitest';
import {
  apptServiceIds,
  apptServices,
  apptServicesLabel,
  appointmentRevenue,
  collectedRevenue,
  buildAppointmentNotes,
  getAppointmentClientName,
} from '../../../src/lib/utils/appointments';
import type { Tables } from '../../../src/lib/types/database.types';

const corte: Tables<'services'> = {
  id: 'svc-corte',
  business_id: 'biz-1',
  name: 'Corte',
  category: null,
  duration_minutes: 30,
  price: 500,
  active: true,
  created_at: null,
};
const tinte: Tables<'services'> = {
  id: 'svc-tinte',
  business_id: 'biz-1',
  name: 'Tinte',
  category: null,
  duration_minutes: 90,
  price: 1500,
  active: true,
  created_at: null,
};
const services = [corte, tinte];

function makeAppointment(overrides: Partial<Tables<'appointments'>>): Tables<'appointments'> {
  return {
    id: 'appt-1',
    business_id: 'biz-1',
    customer_id: null,
    employee_id: 'biz-1',
    service_id: 'svc-corte',
    service_ids: null,
    start_at: '2026-01-15T10:00:00Z',
    end_at: '2026-01-15T10:30:00Z',
    status: 'completada',
    price: null,
    notes: null,
    created_at: null,
    ...overrides,
  };
}

describe('apptServiceIds', () => {
  it('usa service_ids cuando la cita tiene varios servicios', () => {
    const appt = makeAppointment({ service_ids: ['svc-corte', 'svc-tinte'] });
    expect(apptServiceIds(appt)).toEqual(['svc-corte', 'svc-tinte']);
  });

  it('cae a [service_id] para citas antiguas de un solo servicio', () => {
    const appt = makeAppointment({ service_ids: null, service_id: 'svc-corte' });
    expect(apptServiceIds(appt)).toEqual(['svc-corte']);
  });

  it('devuelve un arreglo vacío si no hay ningún servicio', () => {
    const appt = makeAppointment({ service_ids: null, service_id: '' });
    expect(apptServiceIds(appt)).toEqual([]);
  });
});

describe('apptServices / apptServicesLabel', () => {
  it('resuelve los objetos de servicio a partir de las snapshots', () => {
    const appt = makeAppointment({ service_ids: ['svc-corte', 'svc-tinte'] });
    expect(apptServices(appt, services)).toEqual([corte, tinte]);
    expect(apptServicesLabel(appt, services)).toBe('Corte + Tinte');
  });

  it('devuelve "N/A" si ningún servicio de la cita existe en las snapshots', () => {
    const appt = makeAppointment({ service_ids: ['svc-inexistente'] });
    expect(apptServicesLabel(appt, services)).toBe('N/A');
  });
});

describe('appointmentRevenue', () => {
  it('usa el precio guardado en la cita si existe (no recalcula)', () => {
    const appt = makeAppointment({ price: 2000, service_ids: ['svc-corte', 'svc-tinte'] });
    expect(appointmentRevenue(appt, services)).toBe(2000);
  });

  it('suma el precio de los servicios si la cita no tiene price', () => {
    const appt = makeAppointment({ price: null, service_ids: ['svc-corte', 'svc-tinte'] });
    expect(appointmentRevenue(appt, services)).toBe(2000);
  });
});

describe('collectedRevenue', () => {
  const baseAppt = makeAppointment({ id: 'appt-1', price: 1500, status: 'completada' });

  function makeInvoice(overrides: Partial<Tables<'invoices'>>): Tables<'invoices'> {
    return {
      id: 'inv-1',
      business_id: 'biz-1',
      sale_id: null,
      customer_id: 'cli-1',
      appointment_id: 'appt-1',
      invoice_number: 'FAC-1',
      customer_name: 'Ana',
      payment_method: 'efectivo',
      subtotal: 1500,
      tax_amount: 0,
      total: 1500,
      created_at: null,
      ...overrides,
    };
  }

  function makeCredit(overrides: Partial<Tables<'customer_credits'>>): Tables<'customer_credits'> {
    return {
      id: 'credit-1',
      business_id: 'biz-1',
      customer_id: 'cli-1',
      sale_id: null,
      invoice_id: 'inv-1',
      amount: 1500,
      amount_paid: 0,
      status: 'pendiente',
      created_at: null,
      ...overrides,
    };
  }

  it('sin factura a crédito, es el ingreso completo de la cita', () => {
    const invoice = makeInvoice({ payment_method: 'efectivo' });
    expect(collectedRevenue(baseAppt, services, [invoice], [])).toBe(1500);
  });

  it('a crédito sin abonar nada, no suma ingreso todavía', () => {
    const invoice = makeInvoice({ payment_method: 'credito' });
    const credit = makeCredit({ amount_paid: 0 });
    expect(collectedRevenue(baseAppt, services, [invoice], [credit])).toBe(0);
  });

  it('a crédito con un abono parcial, suma solo lo abonado', () => {
    const invoice = makeInvoice({ payment_method: 'credito' });
    const credit = makeCredit({ amount_paid: 770 });
    expect(collectedRevenue(baseAppt, services, [invoice], [credit])).toBe(770);
  });

  it('sin ninguna factura asociada, usa el ingreso completo de la cita', () => {
    expect(collectedRevenue(baseAppt, services, [], [])).toBe(1500);
  });
});

describe('buildAppointmentNotes', () => {
  it('sin cliente registrado y con nombre walk-in, antepone el marcador', () => {
    expect(buildAppointmentNotes(false, 'María Pérez', '')).toBe('WALKIN:María Pérez');
  });

  it('sin cliente registrado, nombre walk-in y notas adicionales, las une con " | "', () => {
    expect(buildAppointmentNotes(false, 'María Pérez', 'Alergia al amoníaco')).toBe(
      'WALKIN:María Pérez | Alergia al amoníaco'
    );
  });

  it('con cliente registrado, ignora el nombre walk-in aunque tenga texto', () => {
    expect(buildAppointmentNotes(true, 'María Pérez', 'Nota normal')).toBe('Nota normal');
  });

  it('sin nombre walk-in ni notas, devuelve null', () => {
    expect(buildAppointmentNotes(false, '  ', '  ')).toBeNull();
  });
});

describe('getAppointmentClientName', () => {
  const customers: Tables<'customers'>[] = [
    { id: 'cust-1', business_id: 'biz-1', name: 'Ana', phone: null, notes: null, address: null, email: null, created_at: null },
  ];

  it('el cliente registrado tiene prioridad sobre cualquier nota walk-in', () => {
    const appt = makeAppointment({ customer_id: 'cust-1', notes: 'WALKIN:Otro Nombre' });
    expect(getAppointmentClientName(appt, customers, 'Cliente')).toBe('Ana');
  });

  it('sin cliente registrado, extrae el nombre de la nota walk-in', () => {
    const appt = makeAppointment({ customer_id: null, notes: 'WALKIN:María Pérez | Alergia' });
    expect(getAppointmentClientName(appt, customers, 'Cliente')).toBe('María Pérez');
  });

  it('sin cliente ni nota walk-in, usa el texto de reserva', () => {
    const appt = makeAppointment({ customer_id: null, notes: null });
    expect(getAppointmentClientName(appt, customers, 'Cliente')).toBe('Cliente');
  });
});
