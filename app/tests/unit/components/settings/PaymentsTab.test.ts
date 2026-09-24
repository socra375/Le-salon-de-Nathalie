import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const actionsMock = vi.hoisted(() => ({ updateBusinessPaymentMethods: vi.fn() }));
vi.mock('../../../../src/lib/actions/settings', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/settings')>('../../../../src/lib/actions/settings');
  return { ...actual, updateBusinessPaymentMethods: actionsMock.updateBusinessPaymentMethods };
});

const { default: PaymentsTab } = await import('../../../../src/lib/components/settings/PaymentsTab.svelte');

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('PaymentsTab', () => {
  it('todos habilitados por defecto sin configuración previa', () => {
    render(PaymentsTab, { props: { businessId: 'biz-1', business: null } });
    expect((screen.getByLabelText('Efectivo') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Crédito / Fiao') as HTMLInputElement).checked).toBe(true);
  });

  it('respeta los métodos ya deshabilitados del negocio', () => {
    render(PaymentsTab, {
      props: { businessId: 'biz-1', business: { payment_methods: { transferencia: false } } as never },
    });
    expect((screen.getByLabelText('Transferencia') as HTMLInputElement).checked).toBe(false);
  });

  it('guarda los métodos habilitados al enviar', async () => {
    actionsMock.updateBusinessPaymentMethods.mockResolvedValue(undefined);
    render(PaymentsTab, { props: { businessId: 'biz-1', business: null } });

    await fireEvent.click(screen.getByLabelText('Crédito / Fiao'));
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Métodos de Pago' }));

    expect(actionsMock.updateBusinessPaymentMethods).toHaveBeenCalledWith(
      'biz-1',
      { efectivo: true, transferencia: true, tarjeta: true, credito: false },
      expect.any(String)
    );
    expect(await screen.findByText('Métodos de pago guardados.')).toBeTruthy();
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    const { container } = render(PaymentsTab, { props: { businessId: 'biz-1', business: null } });
    await expectNoA11yViolations(container);
  });
});
