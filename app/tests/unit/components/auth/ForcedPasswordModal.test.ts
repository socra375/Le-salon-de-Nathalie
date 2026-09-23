import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

const authActionsMock = vi.hoisted(() => ({ setForcedPassword: vi.fn() }));
vi.mock('../../../../src/lib/actions/auth', async () => {
  const actual = await vi.importActual<typeof import('../../../../src/lib/actions/auth')>(
    '../../../../src/lib/actions/auth'
  );
  return { ...actual, setForcedPassword: authActionsMock.setForcedPassword };
});

const { default: ForcedPasswordModal } = await import('../../../../src/lib/components/auth/ForcedPasswordModal.svelte');

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('ForcedPasswordModal', () => {
  it('es un diálogo modal con el título y el cuerpo traducidos', () => {
    render(ForcedPasswordModal, { props: { onSaved: vi.fn() } });
    expect(screen.getByRole('dialog', { name: 'Crea tu contraseña obligatoria' })).toBeTruthy();
  });

  it('con menos de 6 caracteres, avisa y no llama a setForcedPassword', async () => {
    render(ForcedPasswordModal, { props: { onSaved: vi.fn() } });

    await fireEvent.input(screen.getByLabelText('Nueva Contraseña Admin'), { target: { value: '123' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Establecer Contraseña y Entrar' }));

    expect((await screen.findByRole('alert')).textContent).toBe('La contraseña debe tener al menos 6 caracteres.');
    expect(authActionsMock.setForcedPassword).not.toHaveBeenCalled();
  });

  it('con una contraseña válida, la guarda y avisa al padre', async () => {
    authActionsMock.setForcedPassword.mockResolvedValue({ error: null });
    const onSaved = vi.fn();
    render(ForcedPasswordModal, { props: { onSaved } });

    await fireEvent.input(screen.getByLabelText('Nueva Contraseña Admin'), { target: { value: 'clave-segura-1' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Establecer Contraseña y Entrar' }));

    expect(authActionsMock.setForcedPassword).toHaveBeenCalledWith('clave-segura-1');
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('si falla al guardar, muestra el error y no avisa al padre', async () => {
    authActionsMock.setForcedPassword.mockResolvedValue({ error: { message: 'sesión expirada' } });
    const onSaved = vi.fn();
    render(ForcedPasswordModal, { props: { onSaved } });

    await fireEvent.input(screen.getByLabelText('Nueva Contraseña Admin'), { target: { value: 'clave-segura-1' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Establecer Contraseña y Entrar' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Error guardando contraseña: sesión expirada');
    expect(onSaved).not.toHaveBeenCalled();
  });
});
