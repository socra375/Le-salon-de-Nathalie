import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const activityLogActionsMock = vi.hoisted(() => ({ loadActivityLog: vi.fn() }));
vi.mock('../../../../src/lib/actions/activityLog', () => activityLogActionsMock);

const { default: ActivityLogTab } = await import('../../../../src/lib/components/settings/ActivityLogTab.svelte');

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('ActivityLogTab', () => {
  it('al montar, carga y lista el registro de actividad del negocio', async () => {
    activityLogActionsMock.loadActivityLog.mockResolvedValue([
      { id: 'log-1', business_id: 'biz-1', user_id: 'user-12345678', action: 'Creó un servicio', created_at: '2026-01-01T10:00:00.000Z' },
    ]);

    render(ActivityLogTab, { props: { businessId: 'biz-1' } });

    expect(activityLogActionsMock.loadActivityLog).toHaveBeenCalledWith('biz-1');
    expect(await screen.findByText('Creó un servicio')).toBeTruthy();
    expect(screen.getByText('user-123')).toBeTruthy();
  });

  it('una entrada sin user_id (sistema) muestra la etiqueta de sistema', async () => {
    activityLogActionsMock.loadActivityLog.mockResolvedValue([
      { id: 'log-1', business_id: 'biz-1', user_id: null, action: 'Automático', created_at: null },
    ]);
    render(ActivityLogTab, { props: { businessId: 'biz-1' } });
    expect(await screen.findByText('Sistema')).toBeTruthy();
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    activityLogActionsMock.loadActivityLog.mockResolvedValue([
      { id: 'log-1', business_id: 'biz-1', user_id: 'user-12345678', action: 'Creó un servicio', created_at: '2026-01-01T10:00:00.000Z' },
    ]);
    const { container } = render(ActivityLogTab, { props: { businessId: 'biz-1' } });
    await screen.findByText('Creó un servicio');
    await expectNoA11yViolations(container);
  });
});
