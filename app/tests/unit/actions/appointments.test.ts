import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

const appointmentsApiMock = vi.hoisted(() => ({ listAppointments: vi.fn() }));
vi.mock('../../../src/lib/api/appointments', () => appointmentsApiMock);

const { loadAppointments } = await import('../../../src/lib/actions/appointments');
const { appointments } = await import('../../../src/lib/stores/appointments');

beforeEach(() => {
  vi.clearAllMocks();
  appointments.set([]);
});

describe('loadAppointments', () => {
  it('carga las citas del negocio en el store', async () => {
    appointmentsApiMock.listAppointments.mockResolvedValue([{ id: 'a1' }]);

    await loadAppointments('biz-1');

    expect(appointmentsApiMock.listAppointments).toHaveBeenCalledWith('biz-1');
    expect(get(appointments)).toEqual([{ id: 'a1' }]);
  });
});
