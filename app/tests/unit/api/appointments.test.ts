import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockQueryResult } from '../support/supabaseMock';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));

const { listAppointments, createAppointment, linkAppointmentCustomer, updateAppointmentStatus } = await import(
  '../../../src/lib/api/appointments'
);

beforeEach(() => {
  supabaseMock.from.mockReset();
});

describe('listAppointments', () => {
  it('filtra por negocio y ordena por start_at ascendente', async () => {
    const builder = mockQueryResult(supabaseMock, { data: [], error: null });
    await listAppointments('biz-1');
    expect(supabaseMock.from).toHaveBeenCalledWith('appointments');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'biz-1');
    expect(builder.order).toHaveBeenCalledWith('start_at', { ascending: true });
  });
});

describe('createAppointment', () => {
  it('inserta la cita envuelta en un arreglo', async () => {
    const payload = {
      business_id: 'biz-1',
      employee_id: 'biz-1',
      service_id: 'svc-1',
      start_at: '2026-01-01T10:00:00Z',
      end_at: '2026-01-01T10:30:00Z',
    };
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await createAppointment(payload);
    expect(builder.insert).toHaveBeenCalledWith([payload]);
  });
});

describe('linkAppointmentCustomer', () => {
  it('actualiza customer_id por id de la cita', async () => {
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await linkAppointmentCustomer('appt-1', 'cli-1');
    expect(builder.update).toHaveBeenCalledWith({ customer_id: 'cli-1' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'appt-1');
  });
});

describe('updateAppointmentStatus', () => {
  it('actualiza el estado por id', async () => {
    const builder = mockQueryResult(supabaseMock, { data: null, error: null });
    await updateAppointmentStatus('appt-1', 'completada');
    expect(builder.update).toHaveBeenCalledWith({ status: 'completada' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'appt-1');
  });
});
