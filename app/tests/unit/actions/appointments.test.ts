import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

const appointmentsApiMock = vi.hoisted(() => ({
  listAppointments: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointmentStatus: vi.fn(),
  linkAppointmentCustomer: vi.fn(),
}));
vi.mock('../../../src/lib/api/appointments', () => appointmentsApiMock);

const activityLogApiMock = vi.hoisted(() => ({ logActivity: vi.fn() }));
vi.mock('../../../src/lib/api/activityLog', () => activityLogApiMock);

const { loadAppointments, createAppointment, changeAppointmentStatus, linkAppointmentCustomer, findAppointment } =
  await import('../../../src/lib/actions/appointments');
const { appointments } = await import('../../../src/lib/stores/appointments');

const services = [
  { id: 'svc-1', business_id: 'biz-1', name: 'Corte', category: null, duration_minutes: 30, price: 500, active: true, created_at: null },
  { id: 'svc-2', business_id: 'biz-1', name: 'Tinte', category: null, duration_minutes: 90, price: 1500, active: true, created_at: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  appointments.set([]);
});

describe('loadAppointments', () => {
  it('carga las citas del negocio en el store', async () => {
    appointmentsApiMock.listAppointments.mockResolvedValue([{ id: 'a1' }]);

    await loadAppointments('biz-1');

    expect(appointmentsApiMock.listAppointments).toHaveBeenCalledWith('biz-1');
    expect(get(appointments)).toEqual([{ id: 'a1' }]);
  });
});

describe('createAppointment', () => {
  it('suma duraciones y precios de los servicios elegidos para la hora de fin y el precio total', async () => {
    appointmentsApiMock.createAppointment.mockResolvedValue(undefined);
    appointmentsApiMock.listAppointments.mockResolvedValue([]);

    await createAppointment(
      {
        businessId: 'biz-1',
        customerId: 'cust-1',
        walkinName: '',
        specialistId: 'emp-1',
        serviceIds: ['svc-1', 'svc-2'],
        services,
        startAt: new Date('2026-01-01T10:00:00.000Z'),
        notes: 'Alergia',
      },
      'Creó una cita'
    );

    expect(appointmentsApiMock.createAppointment).toHaveBeenCalledWith({
      business_id: 'biz-1',
      customer_id: 'cust-1',
      employee_id: 'emp-1',
      service_id: 'svc-1',
      service_ids: ['svc-1', 'svc-2'],
      start_at: '2026-01-01T10:00:00.000Z',
      end_at: '2026-01-01T12:00:00.000Z',
      status: 'pendiente',
      price: 2000,
      notes: 'Alergia',
    });
    expect(activityLogApiMock.logActivity).toHaveBeenCalledWith({ business_id: 'biz-1', action: 'Creó una cita' });
  });

  it('sin cliente registrado, antepone el nombre walk-in a las notas', async () => {
    appointmentsApiMock.createAppointment.mockResolvedValue(undefined);
    appointmentsApiMock.listAppointments.mockResolvedValue([]);

    await createAppointment(
      {
        businessId: 'biz-1',
        customerId: null,
        walkinName: 'María Pérez',
        specialistId: 'emp-1',
        serviceIds: ['svc-1'],
        services,
        startAt: new Date('2026-01-01T10:00:00.000Z'),
        notes: '',
      },
      'Creó una cita'
    );

    expect(appointmentsApiMock.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'WALKIN:María Pérez' })
    );
  });
});

describe('changeAppointmentStatus', () => {
  it('actualiza el estado, registra actividad y recarga', async () => {
    appointmentsApiMock.updateAppointmentStatus.mockResolvedValue(undefined);
    appointmentsApiMock.listAppointments.mockResolvedValue([{ id: 'a1', status: 'confirmada' }]);

    await changeAppointmentStatus('biz-1', 'a1', 'confirmada', 'Confirmó una cita');

    expect(appointmentsApiMock.updateAppointmentStatus).toHaveBeenCalledWith('a1', 'confirmada');
    expect(activityLogApiMock.logActivity).toHaveBeenCalledWith({ business_id: 'biz-1', action: 'Confirmó una cita' });
    expect(get(appointments)).toEqual([{ id: 'a1', status: 'confirmada' }]);
  });
});

describe('linkAppointmentCustomer', () => {
  it('enlaza la cita al cliente y actualiza el store local sin recargar', async () => {
    appointments.set([{ id: 'a1', customer_id: null } as never]);
    appointmentsApiMock.linkAppointmentCustomer.mockResolvedValue(undefined);

    await linkAppointmentCustomer('a1', 'cust-1');

    expect(appointmentsApiMock.linkAppointmentCustomer).toHaveBeenCalledWith('a1', 'cust-1');
    expect(get(appointments)).toEqual([{ id: 'a1', customer_id: 'cust-1' }]);
  });
});

describe('findAppointment', () => {
  it('encuentra la cita por id en el store actual', () => {
    appointments.set([{ id: 'a1' } as never, { id: 'a2' } as never]);
    expect(findAppointment('a2')).toEqual({ id: 'a2' });
    expect(findAppointment('no-existe')).toBeUndefined();
  });
});
