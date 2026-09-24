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

const employeesActionsMock = vi.hoisted(() => ({ loadEmployees: vi.fn() }));
vi.mock('../../../../src/lib/actions/employees', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/employees')>('../../../../src/lib/actions/employees');
  return { ...actual, ...employeesActionsMock };
});

const { default: DashboardScreen } = await import('../../../../src/lib/components/dashboard/DashboardScreen.svelte');
const { currentBusinessId, currentBusiness } = await import('../../../../src/lib/stores/session');
const { appointments } = await import('../../../../src/lib/stores/appointments');
const { services } = await import('../../../../src/lib/stores/services');
const { invoices } = await import('../../../../src/lib/stores/invoices');
const { customers, customerCredits } = await import('../../../../src/lib/stores/customers');
const { employees } = await import('../../../../src/lib/stores/employees');
const { activePeriod } = await import('../../../../src/lib/stores/dashboard');

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  currentBusinessId.set('biz-1');
  currentBusiness.set({ id: 'biz-1', name: 'Mi Salón', business_type: 'individual' } as never);
  appointments.set([]);
  services.set([]);
  invoices.set([]);
  customers.set([]);
  customerCredits.set([]);
  employees.set([]);
  activePeriod.set('today');
  appointmentsActionsMock.loadAppointments.mockResolvedValue(undefined);
  servicesActionsMock.loadServices.mockResolvedValue(undefined);
  invoicesActionsMock.loadInvoices.mockResolvedValue(undefined);
  customersActionsMock.loadCustomers.mockResolvedValue(undefined);
  customersActionsMock.loadCredits.mockResolvedValue(undefined);
  employeesActionsMock.loadEmployees.mockResolvedValue(undefined);
});

const corte = { id: 'svc-1', business_id: 'biz-1', name: 'Corte', category: null, duration_minutes: 30, price: 500, active: true, created_at: null };

function todayAt(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** Una cita vieja y cancelada, irrelevante para cualquier cálculo -- solo sirve para sacar la cuenta del estado "sin citas todavía" y ver la vista de números. */
function seedPastAppointment() {
  appointments.set([
    {
      id: 'seed',
      business_id: 'biz-1',
      customer_id: null,
      employee_id: 'biz-1',
      service_id: null,
      service_ids: null,
      start_at: '2020-01-01T09:00:00.000Z',
      end_at: '2020-01-01T09:30:00.000Z',
      status: 'cancelada',
      price: 0,
      notes: null,
      created_at: null,
    } as never,
  ]);
}

describe('DashboardScreen', () => {
  it('cuenta nueva: sin ninguna cita todavía, muestra el checklist de primeros pasos en vez de los números', () => {
    render(DashboardScreen, { props: { onNavigate: vi.fn() } });
    expect(screen.getByText('Deja listo tu negocio')).toBeTruthy();
    expect(screen.queryByText('Resumen')).toBeNull();
  });

  it('cuenta nueva: el paso de servicios/clientes se marca hecho cuando ya hay datos', () => {
    services.set([corte]);
    customers.set([{ id: 'c1', business_id: 'biz-1', name: 'Ana', phone: null, notes: null, address: null, email: null, created_at: null }] as never);
    render(DashboardScreen, { props: { onNavigate: vi.fn() } });

    expect(screen.getByText('3 de 4')).toBeTruthy();
    // Con servicios y clientes ya hechos, solo quedan los botones de agendar cita.
    expect(screen.queryByRole('button', { name: 'Agregar servicio' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Agregar cliente' })).toBeNull();
  });

  it('cuenta nueva: el paso de invitar equipo solo aparece para negocios con equipo', () => {
    render(DashboardScreen, { props: { onNavigate: vi.fn() } });
    expect(screen.queryByText('Invitar a tu equipo')).toBeNull();

    cleanup();
    currentBusiness.set({ id: 'biz-1', name: 'Mi Salón', business_type: 'group' } as never);
    render(DashboardScreen, { props: { onNavigate: vi.fn() } });
    expect(screen.getByText('Invitar a tu equipo')).toBeTruthy();
    expect(screen.getByText('1 de 5')).toBeTruthy();
  });

  it('cuenta nueva: los botones del checklist navegan al destino correcto', async () => {
    const onNavigate = vi.fn();
    render(DashboardScreen, { props: { onNavigate } });

    await fireEvent.click(screen.getByRole('button', { name: 'Agregar servicio' }));
    expect(onNavigate).toHaveBeenCalledWith('services');
  });

  it('cuenta nueva: el botón "Nueva cita" del encabezado navega a agendar', async () => {
    const onNavigate = vi.fn();
    render(DashboardScreen, { props: { onNavigate } });

    // "Nueva cita" también es el botón del paso 4 del checklist -- el del encabezado es el primero en el DOM.
    const headerBtn = screen.getAllByRole('button', { name: 'Nueva cita' })[0]!;
    await fireEvent.click(headerBtn);
    expect(onNavigate).toHaveBeenCalledWith('agenda-new');
  });

  it('con datos: sin citas de hoy, muestra el aviso de vacío', () => {
    seedPastAppointment();
    render(DashboardScreen, { props: { onNavigate: vi.fn() } });
    expect(screen.getByText('No hay citas programadas para hoy.')).toBeTruthy();
  });

  it('con datos: lista las citas de hoy con nombre de cliente y servicio', () => {
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

    render(DashboardScreen, { props: { onNavigate: vi.fn() } });

    expect(screen.getByText(/María/)).toBeTruthy();
    expect(screen.getByText(/Corte/)).toBeTruthy();
  });

  it('con datos: el ingreso neto solo cuenta citas completadas del período activo', () => {
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

    const { container } = render(DashboardScreen, { props: { onNavigate: vi.fn() } });
    expect(container.querySelector('.kpi.hero .kpi-num')?.textContent).toBe('$500.00');
  });

  it('con datos: cambiar de período actualiza qué botón está presionado', async () => {
    seedPastAppointment();
    render(DashboardScreen, { props: { onNavigate: vi.fn() } });

    const weekBtn = screen.getByRole('button', { name: 'Esta Semana' });
    await fireEvent.click(weekBtn);

    expect(weekBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('con datos: las cuentas por cobrar se muestran sin depender del período', () => {
    seedPastAppointment();
    customerCredits.set([
      { id: 'c1', business_id: 'biz-1', customer_id: 'cust-1', sale_id: null, invoice_id: null, amount: 300, amount_paid: 100, status: 'parcial', created_at: null },
    ] as never);

    const { container } = render(DashboardScreen, { props: { onNavigate: vi.fn() } });
    expect(container.querySelector('.kpi.warn .kpi-num')?.textContent).toBe('$200.00');
  });

  it('con datos: desglosa el saldo pendiente por cliente', () => {
    seedPastAppointment();
    customers.set([
      { id: 'cust-1', business_id: 'biz-1', name: 'Carmen Lugo', phone: null, notes: null, address: null, email: null, created_at: null },
    ] as never);
    customerCredits.set([
      { id: 'c1', business_id: 'biz-1', customer_id: 'cust-1', sale_id: null, invoice_id: null, amount: 300, amount_paid: 100, status: 'parcial', created_at: null },
    ] as never);

    render(DashboardScreen, { props: { onNavigate: vi.fn() } });
    expect(screen.getByText('Carmen Lugo')).toBeTruthy();
  });

  it('con datos: sin saldos pendientes, muestra el aviso correspondiente', () => {
    seedPastAppointment();
    render(DashboardScreen, { props: { onNavigate: vi.fn() } });
    expect(screen.getByText('No hay saldos pendientes.')).toBeTruthy();
  });

  it('con datos: muestra el gráfico de actividad de los últimos 7 días', () => {
    seedPastAppointment();
    render(DashboardScreen, { props: { onNavigate: vi.fn() } });
    expect(screen.getByRole('heading', { name: 'Actividad del Negocio' })).toBeTruthy();
  });

  it('con datos: "Ver agenda" y "Ver clientes" navegan a la sección correspondiente', async () => {
    seedPastAppointment();
    const onNavigate = vi.fn();
    render(DashboardScreen, { props: { onNavigate } });

    await fireEvent.click(screen.getByRole('button', { name: 'Ver agenda' }));
    expect(onNavigate).toHaveBeenCalledWith('agenda-view');

    await fireEvent.click(screen.getByRole('button', { name: 'Ver clientes' }));
    expect(onNavigate).toHaveBeenCalledWith('customers');
  });

  it('al montar, carga sus propios datos -- no depende de haber visitado Agenda/Configuración antes', () => {
    render(DashboardScreen, { props: { onNavigate: vi.fn() } });
    expect(appointmentsActionsMock.loadAppointments).toHaveBeenCalledWith('biz-1');
    expect(servicesActionsMock.loadServices).toHaveBeenCalledWith('biz-1');
    expect(invoicesActionsMock.loadInvoices).toHaveBeenCalledWith('biz-1');
    expect(customersActionsMock.loadCustomers).toHaveBeenCalledWith('biz-1');
    expect(customersActionsMock.loadCredits).toHaveBeenCalledWith('biz-1');
    expect(employeesActionsMock.loadEmployees).toHaveBeenCalledWith('biz-1');
  });

  it('sin violaciones de accesibilidad (axe-core), cuenta nueva', async () => {
    const { container } = render(DashboardScreen, { props: { onNavigate: vi.fn() } });
    await expectNoA11yViolations(container);
  });

  it('sin violaciones de accesibilidad (axe-core), con datos', async () => {
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

    const { container } = render(DashboardScreen, { props: { onNavigate: vi.fn() } });
    await expectNoA11yViolations(container);
  });
});
