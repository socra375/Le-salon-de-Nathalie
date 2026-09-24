import { describe, expect, it, vi, beforeEach } from 'vitest';

const supabaseMock = vi.hoisted(() => ({ auth: { getUser: vi.fn() } }));
vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));

const { getAccountInfo } = await import('../../../src/lib/actions/account');

beforeEach(() => vi.clearAllMocks());

describe('getAccountInfo', () => {
  it('prefiere full_name/avatar_url del metadata de Google', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: {
        user: {
          email: 'ana@example.com',
          user_metadata: { full_name: 'Ana Pérez', avatar_url: 'https://avatar.png' },
        },
      },
    });

    expect(await getAccountInfo()).toEqual({ avatarUrl: 'https://avatar.png', name: 'Ana Pérez', email: 'ana@example.com' });
  });

  it('cae a name/picture si no hay full_name/avatar_url', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { email: 'a@b.com', user_metadata: { name: 'Ana', picture: 'https://p.png' } } },
    });

    expect(await getAccountInfo()).toEqual({ avatarUrl: 'https://p.png', name: 'Ana', email: 'a@b.com' });
  });

  it('sin usuario autenticado, devuelve todo vacío', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    expect(await getAccountInfo()).toEqual({ avatarUrl: '', name: '', email: '' });
  });
});
