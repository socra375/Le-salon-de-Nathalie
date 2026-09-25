import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

const apiMock = vi.hoisted(() => ({
  chooseTrialPlan: vi.fn(),
  getMyBusinessAccess: vi.fn(),
}));
vi.mock('../../../src/lib/api/businessAccess', () => apiMock);

const { startPlanTrial } = await import('../../../src/lib/actions/plans');
const { businessAccess, resetSession } = await import('../../../src/lib/stores/session');

beforeEach(() => {
  vi.clearAllMocks();
  resetSession();
});

describe('startPlanTrial', () => {
  it('elige la prueba y refresca el acceso con el nuevo vencimiento', async () => {
    apiMock.chooseTrialPlan.mockResolvedValue('2026-10-15T00:00:00Z');
    const refreshed = {
      status: 'trial',
      plan: 'prueba',
      expires_at: '2026-10-15T00:00:00Z',
      reason: null,
      is_super_admin: false,
      modules: ['facturas', 'equipo', 'estadisticas'],
      trial_plan: 'semestral',
    };
    apiMock.getMyBusinessAccess.mockResolvedValue(refreshed);

    await startPlanTrial('semestral');

    expect(apiMock.chooseTrialPlan).toHaveBeenCalledWith('semestral');
    expect(get(businessAccess)).toEqual(refreshed);
  });

  it('si la BD lo rechaza, propaga el error y no toca el acceso', async () => {
    apiMock.chooseTrialPlan.mockRejectedValue(new Error('La prueba de un plan ya fue elegida'));

    await expect(startPlanTrial('anual')).rejects.toThrow('ya fue elegida');
    expect(apiMock.getMyBusinessAccess).not.toHaveBeenCalled();
    expect(get(businessAccess)).toBeNull();
  });
});
