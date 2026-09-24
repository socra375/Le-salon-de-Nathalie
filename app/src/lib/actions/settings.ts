import { updateBusiness, uploadBusinessLogo, getBusinessLogoPublicUrl } from '../api/businesses';
import { logActivity } from '../api/activityLog';
import { currentBusiness } from '../stores/session';
import { locale } from '../stores/locale';
import type { Locale } from '../i18n';
import type { Tables, TablesUpdate } from '../types/database.types';

function applyBusinessPatch(patch: TablesUpdate<'businesses'>): void {
  currentBusiness.update((b) => (b ? { ...b, ...patch } : b));
}

export interface UpdateBusinessInfoInput {
  businessId: string;
  name: string;
  phone: string;
  address: string;
  website: string;
  logoFile: File | null;
  currentLogoUrl: string | null;
}

export interface UpdateBusinessInfoResult {
  logoUploadError: string | null;
}

/**
 * Si el logo falla al subir, el legado igual guarda el resto de los datos
 * del negocio (solo avisa del error, no aborta) -- el logo se queda con
 * la URL anterior. Distinto de Personalización (fondo), que si aborta.
 */
export async function updateBusinessInfo(
  input: UpdateBusinessInfoInput,
  activityMessage: string
): Promise<UpdateBusinessInfoResult> {
  let logoUrl = input.currentLogoUrl;
  let logoUploadError: string | null = null;

  if (input.logoFile) {
    const ext = input.logoFile.name.split('.').pop();
    const path = `${input.businessId}/logo.${ext}`;
    try {
      await uploadBusinessLogo(path, input.logoFile);
      logoUrl = getBusinessLogoPublicUrl(path);
    } catch (err) {
      logoUploadError = err instanceof Error ? err.message : String(err);
    }
  }

  const patch: TablesUpdate<'businesses'> = {
    name: input.name,
    phone: input.phone,
    address: input.address,
    website: input.website,
    logo_url: logoUrl,
    updated_at: new Date().toISOString(),
  };
  await updateBusiness(input.businessId, patch);
  applyBusinessPatch(patch);
  await logActivity({ business_id: input.businessId, action: activityMessage });

  return { logoUploadError };
}

/** Persiste el idioma elegido y cambia el idioma activo de la interfaz de inmediato -- el legado no registra actividad para esto. */
export async function updateBusinessLanguage(businessId: string, language: Locale): Promise<void> {
  const patch: TablesUpdate<'businesses'> = { language, updated_at: new Date().toISOString() };
  await updateBusiness(businessId, patch);
  applyBusinessPatch(patch);
  locale.set(language);
}

export interface UpdateBusinessAppearanceInput {
  businessId: string;
  backgroundFile: File | null;
  currentBackgroundUrl: string | null;
}

/**
 * A diferencia del logo, si el fondo falla al subir, el legado aborta sin
 * guardar nada más -- por eso acá se deja que `uploadBusinessLogo` (el
 * mismo bucket `business-logos`) propague su error en vez de atraparlo.
 */
export async function updateBusinessAppearance(
  input: UpdateBusinessAppearanceInput,
  activityMessage: string
): Promise<void> {
  let backgroundUrl = input.currentBackgroundUrl;

  if (input.backgroundFile) {
    const ext = input.backgroundFile.name.split('.').pop();
    const path = `${input.businessId}/background.${ext}`;
    await uploadBusinessLogo(path, input.backgroundFile);
    backgroundUrl = `${getBusinessLogoPublicUrl(path)}?t=${Date.now()}`;
  }

  const patch: TablesUpdate<'businesses'> = { background_url: backgroundUrl, updated_at: new Date().toISOString() };
  await updateBusiness(input.businessId, patch);
  applyBusinessPatch(patch);
  await logActivity({ business_id: input.businessId, action: activityMessage });
}

export async function clearBusinessBackground(businessId: string, activityMessage: string): Promise<void> {
  const patch: TablesUpdate<'businesses'> = { background_url: null, updated_at: new Date().toISOString() };
  await updateBusiness(businessId, patch);
  applyBusinessPatch(patch);
  await logActivity({ business_id: businessId, action: activityMessage });
}

export interface UpdateBusinessTaxInput {
  businessId: string;
  currencySymbol: string;
  taxEnabled: boolean;
  taxPercentage: number;
  taxIncludedInPrice: boolean;
}

export async function updateBusinessTax(input: UpdateBusinessTaxInput, activityMessage: string): Promise<void> {
  const patch: TablesUpdate<'businesses'> = {
    currency_symbol: input.currencySymbol,
    tax_enabled: input.taxEnabled,
    tax_percentage: input.taxPercentage,
    tax_included_in_price: input.taxIncludedInPrice,
    updated_at: new Date().toISOString(),
  };
  await updateBusiness(input.businessId, patch);
  applyBusinessPatch(patch);
  await logActivity({ business_id: input.businessId, action: activityMessage });
}

export type BusinessPaymentMethodsConfig = NonNullable<Tables<'businesses'>['payment_methods']>;

export async function updateBusinessPaymentMethods(
  businessId: string,
  methods: BusinessPaymentMethodsConfig,
  activityMessage: string
): Promise<void> {
  const patch: TablesUpdate<'businesses'> = { payment_methods: methods, updated_at: new Date().toISOString() };
  await updateBusiness(businessId, patch);
  applyBusinessPatch(patch);
  await logActivity({ business_id: businessId, action: activityMessage });
}
