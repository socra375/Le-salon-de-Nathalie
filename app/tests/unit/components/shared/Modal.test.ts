import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import ModalTestHost from './ModalTestHost.svelte';

afterEach(() => cleanup());

describe('Modal', () => {
  it('al abrir, enfoca el primer elemento interactivo adentro', async () => {
    render(ModalTestHost);
    await fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Primero' }));
  });

  it('al cerrarse, el foco vuelve a quien abrió el modal', async () => {
    render(ModalTestHost, { props: { dismissible: true } });
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    trigger.focus();
    await fireEvent.click(trigger);

    await fireEvent.keyDown(screen.getByRole('button', { name: 'Primero' }), { key: 'Escape' });

    expect(document.activeElement).toBe(trigger);
  });

  it('Escape llama a onClose cuando el diálogo se puede cancelar', async () => {
    const onClose = vi.fn();
    render(ModalTestHost, { props: { onClose } });
    await fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    await fireEvent.keyDown(screen.getByRole('button', { name: 'Primero' }), { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('sin onClose (diálogo obligatorio), Escape no hace nada', async () => {
    render(ModalTestHost, { props: { dismissible: false } });
    await fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    await fireEvent.keyDown(screen.getByRole('button', { name: 'Primero' }), { key: 'Escape' });

    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('Tab desde el último elemento vuelve al primero (el foco no se escapa)', async () => {
    render(ModalTestHost);
    await fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    const last = screen.getByRole('button', { name: 'Último' });
    last.focus();
    await fireEvent.keyDown(last, { key: 'Tab' });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Primero' }));
  });

  it('Shift+Tab desde el primer elemento va al último', async () => {
    render(ModalTestHost);
    await fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    const first = screen.getByRole('button', { name: 'Primero' });
    first.focus();
    await fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Último' }));
  });

  it('tiene role="dialog", aria-modal y aria-labelledby apuntando al título', async () => {
    render(ModalTestHost);
    await fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('host-title');
  });
});
