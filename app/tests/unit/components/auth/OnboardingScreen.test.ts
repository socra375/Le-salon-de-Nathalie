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

describe('OnboardingScreen', () => {
  it('el campo de tamaño del equipo no aparece por defecto (negocio individual)', () => {
    render(OnboardingScreen, { props: { onCompleted: vi.fn() } });
    expect(screen.queryByLabelText('¿Cuántos estilistas/especialistas conforman el equipo?')).toBeNull();
  });

  it('elegir "Salón con equipo" revela el campo de tamaño del equipo', async () => {
    render(OnboardingScreen, { props: { onCompleted: vi.fn() } });
    await fireEvent.click(screen.getByLabelText('Salón con equipo'));
    expect(screen.getByLabelText('¿Cuántos estilistas/especialistas conforman el equipo?')).toBeTruthy();
  });

  it('sin nombre, avisa y no llama a completeOnboarding', async () => {
    render(OnboardingScreen, { props: { onCompleted: vi.fn() } });
    await fireEvent.click(screen.getByRole('button', { name: 'Continuar al Dashboard' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Por favor ingresa un nombre.');
    expect(authActionsMock.completeOnboarding).not.toHaveBeenCalled();
  });

  it('negocio individual: envía type "individual" y teamSize null', async () => {
    authActionsMock.completeOnboarding.mockResolvedValue({ requiresForcedPassword: false });
    const onCompleted = vi.fn();
    render(OnboardingScreen, { props: { onCompleted } });

    await fireEvent.input(screen.getByLabelText('Nombre del Salón'), { target: { value: 'Mi Salón' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Continuar al Dashboard' }));

    expect(authActionsMock.completeOnboarding).toHaveBeenCalledWith({
      businessId: 'biz-1',
      name: 'Mi Salón',
      type: 'individual',
      teamSize: null,
    });
    await vi.waitFor(() => expect(onCompleted).toHaveBeenCalledWith({ requiresForcedPassword: false }));
  });

  it('negocio con equipo: envía type "group" y el tamaño del equipo como número', async () => {
    authActionsMock.completeOnboarding.mockResolvedValue({ requiresForcedPassword: true });
    const onCompleted = vi.fn();
    render(OnboardingScreen, { props: { onCompleted } });

    await fireEvent.input(screen.getByLabelText('Nombre del Salón'), { target: { value: 'Salón con Equipo' } });
    await fireEvent.click(screen.getByLabelText('Salón con equipo'));
    await fireEvent.input(screen.getByLabelText('¿Cuántos estilistas/especialistas conforman el equipo?'), {
      target: { value: '5' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Continuar al Dashboard' }));

    expect(authActionsMock.completeOnboarding).toHaveBeenCalledWith({
      businessId: 'biz-1',
      name: 'Salón con Equipo',
      type: 'group',
      teamSize: 5,
    });
    await vi.waitFor(() => expect(onCompleted).toHaveBeenCalledWith({ requiresForcedPassword: true }));
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    const { container } = render(OnboardingScreen, { props: { onCompleted: vi.fn() } });
    await fireEvent.click(screen.getByLabelText('Salón con equipo'));
    await expectNoA11yViolations(container);
  });
});
