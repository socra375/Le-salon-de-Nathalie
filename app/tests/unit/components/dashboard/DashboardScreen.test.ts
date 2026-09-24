import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const { default: DashboardScreen } = await import('../../../../src/lib/components/dashboard/DashboardScreen.svelte');
const { appointments } = await import('../../../../src/lib/stores/appointments');
const { services } = await import('../../../../src/lib/stores/services');
const { invoices } = await import('../../../../src/lib/stores/invoices');
const { customers, customerCredits } = await import('../../../../src/lib/stores/customers');
const { activePeriod } = await import('../../../../src/lib/stores/dashboard');

afterEach(() => cleanup());

beforeEach(() => {
  appointments.set([]);
  services.set([]);
  invoices.set([]);
  customers.set([]);
  customerCredits.set([]);
  activePeriod.set('today');
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
