import { describe, expect, it } from 'vitest';
import {
  toDateInputValue,
  isSameCalendarDay,
  isSameCalendarMonth,
  getCalendarWeekRange,
  isWithinCalendarWeek,
} from '../../../src/lib/utils/dates';

describe('toDateInputValue', () => {
  it('devuelve YYYY-MM-DD en la fecha local, no en UTC', () => {
    // 2026-01-15 10:00 hora local -> debe seguir siendo el día 15, sin
    // importar el desfase de huso horario del entorno donde corran las
    // pruebas (por eso se compara contra un Date local, no un string UTC).
    const date = new Date(2026, 0, 15, 10, 0, 0);
    expect(toDateInputValue(date)).toBe('2026-01-15');
  });
});

describe('isSameCalendarDay', () => {
  it('es true para el mismo día en horas distintas', () => {
    expect(isSameCalendarDay(new Date(2026, 0, 15, 1, 0), new Date(2026, 0, 15, 23, 59))).toBe(true);
  });

  it('es false para días distintos', () => {
    expect(isSameCalendarDay(new Date(2026, 0, 15), new Date(2026, 0, 16))).toBe(false);
  });
});

describe('isSameCalendarMonth', () => {
  it('es true dentro del mismo mes y año', () => {
    expect(isSameCalendarMonth(new Date(2026, 2, 1), new Date(2026, 2, 28))).toBe(true);
  });

  it('es false si cambia el año aunque el mes numérico coincida', () => {
    expect(isSameCalendarMonth(new Date(2025, 2, 1), new Date(2026, 2, 1))).toBe(false);
  });
});

describe('getCalendarWeekRange / isWithinCalendarWeek', () => {
  it('la semana empieza en lunes 00:00 y termina el siguiente lunes 00:00', () => {
    const wednesday = new Date(2026, 0, 21); // 21 ene 2026 es miércoles
    const { start, end } = getCalendarWeekRange(wednesday);
    expect(start.getDay()).toBe(1); // lunes
    expect(start.toDateString()).toBe(new Date(2026, 0, 19).toDateString());
    expect(end.toDateString()).toBe(new Date(2026, 0, 26).toDateString());
  });

  it('el lunes de la semana pasada NO cae dentro de la semana actual (el bug ya corregido)', () => {
    const thisMonday = new Date(2026, 0, 19, 10, 0);
    const lastMonday = new Date(2026, 0, 12, 10, 0);
    expect(isWithinCalendarWeek(thisMonday, thisMonday)).toBe(true);
    expect(isWithinCalendarWeek(lastMonday, thisMonday)).toBe(false);
  });

  it('el domingo sí cae dentro de la semana calendario', () => {
    const wednesday = new Date(2026, 0, 21);
    const sundayOfSameWeek = new Date(2026, 0, 25, 23, 0);
    expect(isWithinCalendarWeek(sundayOfSameWeek, wednesday)).toBe(true);
  });
});
