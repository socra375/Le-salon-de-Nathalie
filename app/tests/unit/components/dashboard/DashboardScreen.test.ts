import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const appointmentsActionsMock = vi.hoisted(() => ({ loadAppointments: vi.fn() }));
vi.mock('../../../../src/lib/actions/appointments', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/appointments')>(
      '../../../../src/lib/actions/appointments'
    );
  return { ...actual, ...appointmentsActionsMock };
});

const servicesActionsMock = vi.hoisted(() => ({ loadServices: vi.fn() }));
vi.mock('../../../../src/lib/actions/services', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/services')>('../../../../src/lib/actions/services');
  return { ...actual, ...servicesActionsMock };
});

const invoicesActionsMock = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock('../../../../src/lib/actions/invoices', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/invoices')>('../../../../src/lib/actions/invoices');
  return { ...actual, ...invoicesActionsMock };
});

const customersActionsMock = vi.hoisted(() => ({ loadCustomers: vi.fn(), loadCredits: vi.fn() }));
vi.mock('../../../../src/lib/actions/customers', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/customers')>('../../../../src/lib/actions/customers');
  return { ...actual, ...customersActionsMock };
});

const { default: DashboardScreen } = await import('../../../../src/lib/components/dashboard/DashboardScreen.svelte');
const { currentBusinessId } = await import('../../../../src/lib/stores/session');
const { appointments } = await import('../../../../src/lib/stores/appointments');
const { services } = await import('../../../../src/lib/stores/services');
const { invoices } = await import('../../../../src/lib/stores/invoices');
const { customers, customerCredits } = await import('../../../../src/lib/stores/customers');
const { activePeriod } = await import('../../../../src/lib/stores/dashboard');

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  currentBusinessId.set('biz-1');
  appointments.set([]);
  services.set([]);
  invoices.set([]);
  customers.set([]);
  customerCredits.set([]);
  activePeriod.set('today');
  appointmentsActionsMock.loadAppointments.mockResolvedValue(undefined);
  servicesActionsMock.loadServices.mockResolvedValue(undefined);
  invoicesActionsMock.loadInvoices.mockResolvedValue(undefined);
  customersActionsMock.loadCustomers.mockResolvedValue(undefined);
  customersActionsMock.loadCredits.mockResolvedValue(undefined);
});

const corte = { id: 'svc-1', business_id: 'biz-1', name: 'Corte', category: null, duration_minutes: 30, price: 500, active: true, created_at: null };

function todayAt(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe('DashboardScreen', () => {
  it('sin citas de hoy, muestra el aviso de vacío', () => {
    render(DashboardScreen);
    expect(screen.getByText('No hay citas programadas para hoy.')).toBeTruthy();
  });

  it('lista las citas de hoy con nombre de cliente y servicio', () => {
    services.set([corte]);
    appointments.set([
      {
        id: 'a1',
        business_id: 'biz-1',
        customer_id: null,
        employee_id: 'biz-1',
        service_id: 'svc-1',
        service_ids: null,
        start_at: todayAt(10),
        end_at: todayAt(11),
        status: 'confirmada',
        price: 500,
        notes: 'WALKIN:María',
        created_at: null,
      } as never,
    ]);

    render(DashboardScreen);

    expect(screen.getByText(/María/)).toBeTruthy();
    expect(screen.getByText(/Corte/)).toBeTruthy();
  });

  it('el ingreso neto solo cuenta citas completadas del período activo', () => {
    services.set([corte]);
    appointments.set([
      {
        id: 'a1',
        business_id: 'biz-1',
        customer_id: null,
        employee_id: 'biz-1',
        service_id: 'svc-1',
        service_ids: null,
        start_at: todayAt(10),
        end_at: todayAt(11),
        status: 'completada',
        price: 500,
        notes: null,
        created_at: null,
      } as never,
    ]);

    const { container } = render(DashboardScreen);
    expect(container.querySelector('.hero-metric .val-large')?.textContent).toBe('$500.00');
  });

  it('cambiar de período actualiza qué botón está presionado', async () => {
    render(DashboardScreen);

    const weekBtn = screen.getByRole('button', { name: 'Esta Semana' });
    await fireEvent.click(weekBtn);

    expect(weekBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('las cuentas por cobrar se muestran sin depender del período', () => {
    customerCredits.set([
      { id: 'c1', business_id: 'biz-1', customer_id: 'cust-1', sale_id: null, invoice_id: null, amount: 300, amount_paid: 100, status: 'parcial', created_at: null },
    ] as never);

    render(DashboardScreen);
    expect(screen.getByText('$200.00')).toBeTruthy();
  });

  it('muestra el gráfico de actividad de los últimos 7 días', () => {
    render(DashboardScreen);
    expect(screen.getByRole('heading', { name: 'Actividad del Negocio' })).toBeTruthy();
  });

  it('al montar, carga sus propios datos -- no depende de haber visitado Agenda/Configuración antes', () => {
    render(DashboardScreen);
    expect(appointmentsActionsMock.loadAppointments).toHaveBeenCalledWith('biz-1');
    expect(servicesActionsMock.loadServices).toHaveBeenCalledWith('biz-1');
    expect(invoicesActionsMock.loadInvoices).toHaveBeenCalledWith('biz-1');
    expect(customersActionsMock.loadCustomers).toHaveBeenCalledWith('biz-1');
    expect(customersActionsMock.loadCredits).toHaveBeenCalledWith('biz-1');
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    services.set([corte]);
    appointments.set([
      {
        id: 'a1',
        business_id: 'biz-1',
        customer_id: null,
        employee_id: 'biz-1',
        service_id: 'svc-1',
        service_ids: null,
        start_at: todayAt(10),
        end_at: todayAt(11),
        status: 'confirmada',
        price: 500,
        notes: null,
        created_at: null,
      } as never,
    ]);

    const { container } = render(DashboardScreen);
    await expectNoA11yViolations(container);
  });
});
