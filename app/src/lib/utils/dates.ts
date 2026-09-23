// Utilidades de fecha puras (sin `new Date()` implícito ni lectura de
// globals) usadas por los filtros de periodo del dashboard. La distinción
// entre "ventana móvil" y "fecha civil" importa de verdad aquí: un bug real
// del legado (corregido en esta misma sesión) trataba "Esta Semana" como
// los últimos 7 días desde ahora mismo, en vez de la semana calendario que
// el botón promete — daba un total distinto según la hora del día.

export function toDateInputValue(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function isSameCalendarMonth(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export interface CalendarWeekRange {
  start: Date;
  end: Date;
}

/** Semana calendario: lunes 00:00 (inclusive) al lunes siguiente 00:00 (exclusive). */
export function getCalendarWeekRange(reference: Date): CalendarWeekRange {
  const dayOfWeek = (reference.getDay() + 6) % 7; // 0 = lunes ... 6 = domingo
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - dayOfWeek);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return { start, end };
}

export function isWithinCalendarWeek(date: Date, reference: Date): boolean {
  const { start, end } = getCalendarWeekRange(reference);
  return date >= start && date < end;
}
