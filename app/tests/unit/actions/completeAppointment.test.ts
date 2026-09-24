import { describe, expect, it, vi, beforeEach } from 'vitest';

const appointmentsActionsMock = vi.hoisted(() => ({ changeAppointmentStatus: vi.fn() }));
vi.mock('../../../src/lib/actions/appointments', () => appointmentsActionsMock);

const invoicesActionsMock = vi.hoisted(() => ({ createInvoiceForAppointment: vi.fn() }));
vi.mock('../../../src/lib/actions/invoices', () => invoicesActionsMock);

const { completeAppointment } = await import('../../../src/lib/actions/completeAppointment');

const appt = { id: 'appt-1', business_id: 'biz-1', customer_id: 'cust-1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('completeAppointment', () => {
  it('primero marca la cita como completada y luego factura, en ese orden', async () => {
    const callOrder: string[] = [];
    appointmentsActionsMock.changeAppointmentStatus.mockImplementation(async () => {
      callOrder.push('status');
    });
    invoicesActionsMock.createInvoiceForAppointment.mockImplementation(async () => {
      callOrder.push('invoice');
      return { id: 'inv-1' };
    });

    const buildInvoiceActivityMessage = (number: string) => `Factura generada ${number}`;
    const invoice = await completeAppointment({
      businessId: 'biz-1',
      appt,
      services: [],
      business: null,
      customerName: 'Ana',
      paymentMethod: 'efectivo',
      statusActivityMessage: 'Completó una cita',
      buildInvoiceActivityMessage,
    });

    expect(callOrder).toEqual(['status', 'invoice']);
    expect(appointmentsActionsMock.changeAppointmentStatus).toHaveBeenCalledWith(
      'biz-1',
      'appt-1',
      'completada',
      'Completó una cita'
    );
    expect(invoicesActionsMock.createInvoiceForAppointment).toHaveBeenCalledWith({
      businessId: 'biz-1',
      appt,
      services: [],
      business: null,
      customerId: 'cust-1',
      customerName: 'Ana',
      paymentMethod: 'efectivo',
      buildActivityMessage: buildInvoiceActivityMessage,
    });
    expect(invoice).toEqual({ id: 'inv-1' });
  });
});
