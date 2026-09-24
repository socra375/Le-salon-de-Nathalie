import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

const businessesApiMock = vi.hoisted(() => ({
  updateBusiness: vi.fn(),
  uploadBusinessLogo: vi.fn(),
  getBusinessLogoPublicUrl: vi.fn(),
}));
vi.mock('../../../src/lib/api/businesses', () => businessesApiMock);

const activityLogApiMock = vi.hoisted(() => ({ logActivity: vi.fn() }));
vi.mock('../../../src/lib/api/activityLog', () => activityLogApiMock);

const {
  updateBusinessInfo,
  updateBusinessLanguage,
  updateBusinessAppearance,
  clearBusinessBackground,
  updateBusinessTax,
  updateBusinessPaymentMethods,
} = await import('../../../src/lib/actions/settings');
const { currentBusiness } = await import('../../../src/lib/stores/session');
const { locale } = await import('../../../src/lib/stores/locale');

beforeEach(() => {
  vi.clearAllMocks();
  currentBusiness.set({ id: 'biz-1', name: 'Viejo Nombre', logo_url: 'https://old-logo' } as never);
  locale.set('es');
});

describe('updateBusinessInfo', () => {
  it('sin archivo de logo, guarda los datos y conserva la URL del logo actual', async () => {
    businessesApiMock.updateBusiness.mockResolvedValue(undefined);

    const result = await updateBusinessInfo(
      {
        businessId: 'biz-1',
        name: 'Salón Nuevo',
        phone: '555',
        address: 'Calle 1',
        website: 'www.salon.com',
        logoFile: null,
        currentLogoUrl: 'https://old-logo',
      },
      'Actualizó datos del negocio'
    );

    expect(result).toEqual({ logoUploadError: null });
    expect(businessesApiMock.uploadBusinessLogo).not.toHaveBeenCalled();
    expect(businessesApiMock.updateBusiness).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({ name: 'Salón Nuevo', logo_url: 'https://old-logo' })
    );
    expect(get(currentBusiness)).toMatchObject({ name: 'Salón Nuevo' });
    expect(activityLogApiMock.logActivity).toHaveBeenCalledWith({
      business_id: 'biz-1',
      action: 'Actualizó datos del negocio',
    });
  });

  it('con un logo nuevo, lo sube y usa la URL pública resultante', async () => {
    businessesApiMock.uploadBusinessLogo.mockResolvedValue(undefined);
    businessesApiMock.getBusinessLogoPublicUrl.mockReturnValue('https://new-logo.png');
    businessesApiMock.updateBusiness.mockResolvedValue(undefined);
    const file = new File(['x'], 'logo.png', { type: 'image/png' });

    const result = await updateBusinessInfo(
      { businessId: 'biz-1', name: 'Salón', phone: '', address: '', website: '', logoFile: file, currentLogoUrl: null },
      'Actualizó datos del negocio'
    );

    expect(businessesApiMock.uploadBusinessLogo).toHaveBeenCalledWith('biz-1/logo.png', file);
    expect(result).toEqual({ logoUploadError: null });
    expect(businessesApiMock.updateBusiness).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({ logo_url: 'https://new-logo.png' })
    );
  });

  it('si el logo falla al subir, igual guarda el resto de los datos con la URL anterior', async () => {
    businessesApiMock.uploadBusinessLogo.mockRejectedValue(new Error('bucket lleno'));
    businessesApiMock.updateBusiness.mockResolvedValue(undefined);
    const file = new File(['x'], 'logo.png', { type: 'image/png' });

    const result = await updateBusinessInfo(
      { businessId: 'biz-1', name: 'Salón', phone: '', address: '', website: '', logoFile: file, currentLogoUrl: 'https://old-logo' },
      'Actualizó datos del negocio'
    );

    expect(result).toEqual({ logoUploadError: 'bucket lleno' });
    expect(businessesApiMock.updateBusiness).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({ logo_url: 'https://old-logo' })
    );
  });
});

describe('updateBusinessLanguage', () => {
  it('persiste el idioma y cambia el idioma activo de inmediato, sin registrar actividad', async () => {
    businessesApiMock.updateBusiness.mockResolvedValue(undefined);

    await updateBusinessLanguage('biz-1', 'en');

    expect(businessesApiMock.updateBusiness).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({ language: 'en' })
    );
    expect(get(locale)).toBe('en');
    expect(activityLogApiMock.logActivity).not.toHaveBeenCalled();
  });
});

describe('updateBusinessAppearance', () => {
  it('sube el fondo con un sufijo anti-caché y lo guarda', async () => {
    businessesApiMock.uploadBusinessLogo.mockResolvedValue(undefined);
    businessesApiMock.getBusinessLogoPublicUrl.mockReturnValue('https://bg.png');
    businessesApiMock.updateBusiness.mockResolvedValue(undefined);
    const file = new File(['x'], 'bg.png', { type: 'image/png' });

    await updateBusinessAppearance(
      { businessId: 'biz-1', backgroundFile: file, currentBackgroundUrl: null },
      'Actualizó personalización'
    );

    expect(businessesApiMock.uploadBusinessLogo).toHaveBeenCalledWith('biz-1/background.png', file);
    expect(businessesApiMock.updateBusiness).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({ background_url: expect.stringMatching(/^https:\/\/bg\.png\?t=\d+$/) })
    );
  });

  it('si la subida del fondo falla, aborta sin guardar nada (no como el logo)', async () => {
    businessesApiMock.uploadBusinessLogo.mockRejectedValue(new Error('bucket lleno'));
    const file = new File(['x'], 'bg.png', { type: 'image/png' });

    await expect(
      updateBusinessAppearance({ businessId: 'biz-1', backgroundFile: file, currentBackgroundUrl: null }, 'x')
    ).rejects.toThrow('bucket lleno');
    expect(businessesApiMock.updateBusiness).not.toHaveBeenCalled();
  });
});

describe('clearBusinessBackground', () => {
  it('guarda background_url en null', async () => {
    businessesApiMock.updateBusiness.mockResolvedValue(undefined);
    await clearBusinessBackground('biz-1', 'Quitó el fondo');
    expect(businessesApiMock.updateBusiness).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({ background_url: null })
    );
  });
});

describe('updateBusinessTax', () => {
  it('guarda moneda e impuestos', async () => {
    businessesApiMock.updateBusiness.mockResolvedValue(undefined);
    await updateBusinessTax(
      { businessId: 'biz-1', currencySymbol: 'RD$', taxEnabled: true, taxPercentage: 18, taxIncludedInPrice: false },
      'Actualizó impuestos'
    );
    expect(businessesApiMock.updateBusiness).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({
        currency_symbol: 'RD$',
        tax_enabled: true,
        tax_percentage: 18,
        tax_included_in_price: false,
      })
    );
  });
});

describe('updateBusinessPaymentMethods', () => {
  it('guarda los métodos de pago habilitados', async () => {
    businessesApiMock.updateBusiness.mockResolvedValue(undefined);
    const methods = { efectivo: true, transferencia: false, tarjeta: true, credito: true };
    await updateBusinessPaymentMethods('biz-1', methods, 'Actualizó métodos de pago');
    expect(businessesApiMock.updateBusiness).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({ payment_methods: methods })
    );
  });
});
