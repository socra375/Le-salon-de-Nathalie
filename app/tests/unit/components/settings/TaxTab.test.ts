import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const actionsMock = vi.hoisted(() => ({ updateBusinessTax: vi.fn() }));
vi.mock('../../../../src/lib/actions/settings', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/settings')>('../../../../src/lib/actions/settings');
  return { ...actual, updateBusinessTax: actionsMock.updateBusinessTax };
});

const { default: TaxTab } = await import('../../../../src/lib/components/settings/TaxTab.svelte');

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('TaxTab', () => {
  it('sin impuesto habilitado, no muestra el porcentaje ni el modo', () => {
    render(TaxTab, { props: { businessId: 'biz-1', business: null } });
    expect(screen.queryByLabelText('Porcentaje de Impuesto (%)')).toBeNull();
  });

  it('al habilitar el impuesto, aparecen porcentaje y modo', async () => {
    render(TaxTab, { props: { businessId: 'biz-1', business: null } });
    await fireEvent.click(screen.getByLabelText('¿Tu negocio aplica impuestos?'));
    expect(screen.getByLabelText('Porcentaje de Impuesto (%)')).toBeTruthy();
  });

  it('guarda moneda e impuestos con los valores elegidos', async () => {
    actionsMock.updateBusinessTax.mockResolvedValue(undefined);
    render(TaxTab, { props: { businessId: 'biz-1', business: null } });

    await fireEvent.change(screen.getByLabelText('Símbolo de Moneda'), { target: { value: 'RD$' } });
    await fireEvent.click(screen.getByLabelText('¿Tu negocio aplica impuestos?'));
    await fireEvent.input(screen.getByLabelText('Porcentaje de Impuesto (%)'), { target: { value: '18' } });
    await fireEvent.click(screen.getByLabelText('Se suma al vender'));
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Moneda e Impuestos' }));

    expect(actionsMock.updateBusinessTax).toHaveBeenCalledWith(
      {
        businessId: 'biz-1',
        currencySymbol: 'RD$',
        taxEnabled: true,
        taxPercentage: 18,
        taxIncludedInPrice: false,
      },
      expect.any(String)
    );
    expect(await screen.findByText('Configuración fiscal guardada.')).toBeTruthy();
  });

  it('sin violaciones de accesibilidad (axe-core), con el impuesto habilitado', async () => {
    const { container } = render(TaxTab, { props: { businessId: 'biz-1', business: null } });
    await fireEvent.click(screen.getByLabelText('¿Tu negocio aplica impuestos?'));
    await expectNoA11yViolations(container);
  });
});
