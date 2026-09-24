import { describe, expect, it, vi, beforeEach } from 'vitest';

const activityLogApiMock = vi.hoisted(() => ({ listActivityLog: vi.fn() }));
vi.mock('../../../src/lib/api/activityLog', () => activityLogApiMock);

const { loadActivityLog } = await import('../../../src/lib/actions/activityLog');

beforeEach(() => vi.clearAllMocks());

describe('loadActivityLog', () => {
  it('devuelve el registro de actividad del negocio', async () => {
    activityLogApiMock.listActivityLog.mockResolvedValue([{ id: 'log-1' }]);
    expect(await loadActivityLog('biz-1')).toEqual([{ id: 'log-1' }]);
    expect(activityLogApiMock.listActivityLog).toHaveBeenCalledWith('biz-1');
  });
});
