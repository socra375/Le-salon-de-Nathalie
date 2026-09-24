import { writable } from 'svelte/store';
import type { DashboardPeriod } from '../utils/dashboard';
import { toDateInputValue } from '../utils/dates';

/** Solo estado -- el período elegido en el selector Hoy/Esta Semana/Este Mes. */
export const activePeriod = writable<DashboardPeriod>('today');

/**
 * El día puntual a mostrar cuando el período activo es "today" -- el
 * selector de fecha del dashboard lo cambia para ver las ganancias/agenda
 * de cualquier día, no solo el de hoy. No afecta a "Esta Semana"/"Este Mes",
 * que siempre son relativos al día real.
 */
export const selectedDay = writable<string>(toDateInputValue(new Date()));
