import { writable } from 'svelte/store';
import type { Tables } from '../types/database.types';

/**
 * Solo estado. Clientes lo necesita para el historial de cada cuenta
 * (misma dependencia que en el legado, donde `appointmentsSnapshot` ya
 * está cargado globalmente para cuando alguien abre esa pantalla); Agenda,
 * en su propia sección de la Fase 5, lo hace crecer con la orquestación de
 * crear/actualizar citas.
 */
export const appointments = writable<Tables<'appointments'>[]>([]);
