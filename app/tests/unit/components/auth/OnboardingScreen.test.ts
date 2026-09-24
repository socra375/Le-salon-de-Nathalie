import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const authActionsMock = vi.hoisted(() => ({ completeOnboarding: vi.fn() }));
vi.mock('../../../../src/lib/actions/auth', async () => {
  const actual = await vi.importActual<typeof import('../../../../src/lib/actions/auth')>(
    '../../../../src/lib/actions/auth'
  );
  return { ...actual, completeOnboarding: authActionsMock.completeOnboarding };
});

const { default: OnboardingScreen } = await import('../../../../src/lib/components/auth/OnboardingScreen.svelte');
const { currentBusinessId } = await import('../../../../src/lib/stores/session');

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  currentBusinessId.set('biz-1');
});

async function fillValidForm() {
  await fireEvent.input(screen.getByLabelText('Nombre de tu negocio'), { target: { value: 'Mi Salón' } });
  await fireEvent.click(screen.getByLabelText('Solo yo'));
  await fireEvent.change(screen.getByLabelText('Moneda con la que cobras'), { target: { value: 'USD' } });
}

describe('OnboardingScreen', () => {
  it('el botón "Empezar" arranca deshabilitado', () => {
    render(OnboardingScreen, { props: { onCompleted: vi.fn() } });
    const button = screen.getByRole('button', { name: 'Empezar' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('con los tres datos completos, el botón se habilita', async () => {
    render(OnboardingScreen, { props: { onCompleted: vi.fn() } });
    await fillValidForm();
    const button = screen.getByRole('button', { name: 'Empezar' }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('elegir "Solo yo" o "Con equipo" cambia el texto de ayuda', async () => {
    render(OnboardingScreen, { props: { onCompleted: vi.fn() } });
    expect(screen.getByText('Elige una opción para adaptar el gestor a tu negocio.')).toBeTruthy();

    await fireEvent.click(screen.getByLabelText('Solo yo'));
    expect(screen.getByText('Sin equipo, ocultamos comisiones y horarios de personal.')).toBeTruthy();

    await fireEvent.click(screen.getByLabelText('Con equipo'));
    expect(screen.getByText('Con equipo, podrás agendar por persona y calcular comisiones.')).toBeTruthy();
  });

  it('sin completar los datos, el envío directo del formulario avisa y no llama a completeOnboarding', async () => {
    const { container } = render(OnboardingScreen, { props: { onCompleted: vi.fn() } });
    // El botón está deshabilitado a propósito; se dispara el submit directo
    // sobre el <form> para probar la validación defensiva de handleSubmit.
    const form = container.querySelector('form');
    await fireEvent.submit(form!);

    expect((await screen.findByRole('alert')).textContent).toBe('Por favor ingresa un nombre.');
    expect(authActionsMock.completeOnboarding).not.toHaveBeenCalled();
  });

  it('negocio individual: envía type "individual", teamSize null y el símbolo de moneda elegido', async () => {
    authActionsMock.completeOnboarding.mockResolvedValue({ requiresForcedPassword: false });
    const onCompleted = vi.fn();
    render(OnboardingScreen, { props: { onCompleted } });

    await fillValidForm();
    await fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));

    expect(authActionsMock.completeOnboarding).toHaveBeenCalledWith({
      businessId: 'biz-1',
      name: 'Mi Salón',
      type: 'individual',
      teamSize: null,
      currencySymbol: '$',
    });
    await vi.waitFor(() => expect(onCompleted).toHaveBeenCalledWith({ requiresForcedPassword: false }));
  });

  it('negocio con equipo: envía type "group" y el símbolo de la moneda elegida', async () => {
    authActionsMock.completeOnboarding.mockResolvedValue({ requiresForcedPassword: true });
    const onCompleted = vi.fn();
    render(OnboardingScreen, { props: { onCompleted } });

    await fireEvent.input(screen.getByLabelText('Nombre de tu negocio'), { target: { value: 'Salón con Equipo' } });
    await fireEvent.click(screen.getByLabelText('Con equipo'));
    await fireEvent.change(screen.getByLabelText('Moneda con la que cobras'), { target: { value: 'DOP' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));

    expect(authActionsMock.completeOnboarding).toHaveBeenCalledWith({
      businessId: 'biz-1',
      name: 'Salón con Equipo',
      type: 'group',
      teamSize: null,
      currencySymbol: 'RD$',
    });
    await vi.waitFor(() => expect(onCompleted).toHaveBeenCalledWith({ requiresForcedPassword: true }));
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    const { container } = render(OnboardingScreen, { props: { onCompleted: vi.fn() } });
    await fireEvent.click(screen.getByLabelText('Con equipo'));
    await expectNoA11yViolations(container);
  });
});
