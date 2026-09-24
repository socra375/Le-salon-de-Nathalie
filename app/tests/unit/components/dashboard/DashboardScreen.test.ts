import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const { default: DashboardScreen } = await import('../../../../src/lib/components/dashboard/DashboardScreen.svelte');
const { appointments } = await import('../../../../src/lib/stores/appointments');
const { services } = await import('../../../../src/lib/stores/services');
const { invoices } = await import('../../../../src/lib/stores/invoices');
const { customers, customerCredits } = await import('../../../../src/lib/stores/customers');
const { activePeriod, selectedDay } = await import('../../../../src/lib/stores/dashboard');
const { toDateInputValue } = await import('../../../../src/lib/utils/dates');

afterEach(() => cleanup());

beforeEach(() => {
  appointments.set([]);
  services.set([]);
  invoices.set([]);
  customers.set([]);
  customerCredits.set([]);
  activePeriod.set('today');
  selectedDay.set(toDateInputValue(new Date()));
});

const corte = { id: 'svc-1', business_id: 'biz-1', name: 'Corte', category: null, duration_minutes: 30, price: 500, active: true, created_at: null };

function todayAt(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function dayOffsetAt(offsetDays: number, hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function dateInputValue(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
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

    render(DashboardScreen);
    // "$500.00" también aparece en la tabla accesible (oculta visualmente)
    // del gráfico de "Actividad del Negocio", que incluye el ingreso de hoy.
    expect(screen.getAllByText('$500.00').length).toBeGreaterThan(0);
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

  it('el selector de fecha solo aparece en el período "Hoy"', async () => {
    render(DashboardScreen);
    expect(screen.getByLabelText('Ver otro día')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Esta Semana' }));
    expect(screen.queryByLabelText('Ver otro día')).toBeNull();
  });

  it('elegir un día pasado muestra la agenda y las ganancias de ESE día, no las de hoy', async () => {
    services.set([corte]);
    appointments.set([
      {
        id: 'ayer',
        business_id: 'biz-1',
        customer_id: null,
        employee_id: 'biz-1',
        service_id: 'svc-1',
        service_ids: null,
        start_at: dayOffsetAt(-1, 10),
        end_at: dayOffsetAt(-1, 11),
        status: 'completada',
        price: 300,
        notes: 'WALKIN:Ayer Cliente',
        created_at: null,
      } as never,
    ]);

    render(DashboardScreen);
    expect(screen.getByText('No hay citas programadas para hoy.')).toBeTruthy();

    await fireEvent.input(screen.getByLabelText('Ver otro día'), { target: { value: dateInputValue(-1) } });

    expect(await screen.findByText(/Ayer Cliente/)).toBeTruthy();
    expect(screen.getAllByText('$300.00').length).toBeGreaterThan(0);
  });

  it('sin período anterior con datos, muestra la insignia "Nuevo" en vez de un porcentaje', () => {
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

    render(DashboardScreen);
    expect(screen.getAllByText('Nuevo').length).toBeGreaterThan(0);
  });

  it('muestra clientes nuevos y recurrentes del período', () => {
    customers.set([
      { id: 'cust-1', business_id: 'biz-1', name: 'Nueva', phone: null, notes: null, address: null, email: null, created_at: todayAt(8) },
    ] as never);

    render(DashboardScreen);
    expect(screen.getByText('Clientes nuevos')).toBeTruthy();
    expect(screen.getByText('Clientes recurrentes')).toBeTruthy();
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
