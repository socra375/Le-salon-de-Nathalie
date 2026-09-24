import { writable } from 'svelte/store';
import type { DashboardPeriod } from '../utils/dashboard';

/** Solo estado -- el período elegido en el selector Hoy/Esta Semana/Este Mes. */
export const activePeriod = writable<DashboardPeriod>('today');
