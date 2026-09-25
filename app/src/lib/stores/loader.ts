import { writable } from 'svelte/store';

/**
 * Overlay de carga de pantalla completa (componente Loader.svelte),
 * compartido por toda la app: arranque, envío del login, y el resincronizado
 * al volver de otra pestaña tras un rato inactivo. `null` = oculto.
 */
export type LoaderMode = 'boot' | 'login' | 'sync';

export const loader = writable<LoaderMode | null>(null);

export function showLoader(mode: LoaderMode): void {
  loader.set(mode);
}

export function hideLoader(): void {
  loader.set(null);
}
