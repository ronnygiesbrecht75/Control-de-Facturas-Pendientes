/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RucLookupResult {
  success: boolean;
  ruc?: string;
  doc?: number;
  dv?: number;
  razonSocial?: string;
  estado?: string;
  esPersonaJuridica?: boolean;
  error?: string;
}

/**
 * Calculates the Paraguayan Taxpayer Check Digit (Dígito Verificador - DV)
 * according to the official SET/DNIT algorithm (Módulo 11).
 */
export function calculateParaguayDV(docNumber: string | number): number {
  const cleanDoc = String(docNumber).replace(/\D/g, '');
  if (!cleanDoc) return 0;

  const base = 11;
  let factor = 2;
  let sum = 0;

  // Process reversed digits
  for (let i = cleanDoc.length - 1; i >= 0; i--) {
    const digit = parseInt(cleanDoc[i], 10);
    sum += digit * factor;
    factor++;
    if (factor > 9) {
      factor = 2;
    }
  }

  const remainder = sum % base;
  return remainder > 1 ? base - remainder : 0;
}

/**
 * Formats a raw document number or RUC into standard "1234567-8" format.
 */
export function formatRuc(input: string): string {
  const clean = input.trim().replace(/[^\d-]/g, '');
  if (!clean) return '';

  if (clean.includes('-')) {
    const [num, dv] = clean.split('-');
    const cleanNum = num.replace(/\D/g, '');
    const cleanDv = dv.replace(/\D/g, '').substring(0, 1);
    return cleanDv ? `${cleanNum}-${cleanDv}` : cleanNum;
  }

  // If only numbers provided and length >= 5, can suggest or calculate DV
  return clean;
}

/**
 * Looks up taxpayer information from Paraguay SET / DNIT by RUC or CI.
 * First tries local server proxy (/api/ruc/:ruc), with fallback to direct turuc API.
 */
export async function lookupRucParaguay(query: string): Promise<RucLookupResult> {
  const clean = query.trim().replace(/[^\d-]/g, '');
  if (!clean || clean.length < 3) {
    return {
      success: false,
      error: 'Ingresa un número de RUC o C.I. válido (al menos 3 dígitos).'
    };
  }

  // 1. Try local server proxy endpoint
  try {
    const proxyRes = await fetch(`/api/ruc/${encodeURIComponent(clean)}`, {
      headers: { Accept: 'application/json' }
    });

    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json.success && json.razonSocial) {
        return {
          success: true,
          ruc: json.ruc,
          doc: json.doc,
          dv: json.dv,
          razonSocial: json.razonSocial,
          estado: json.estado,
          esPersonaJuridica: json.esPersonaJuridica
        };
      } else if (json.message) {
        return {
          success: false,
          error: json.message
        };
      }
    }
  } catch {
    // Proxy request failed (e.g. offline or desktop standalone without proxy), fallback to direct API
  }

  // 2. Direct client fallback to turuc.com.py public API
  try {
    const directRes = await fetch(`https://turuc.com.py/api/contribuyente/${encodeURIComponent(clean)}`, {
      headers: { Accept: 'application/json' }
    });

    if (directRes.ok) {
      const json = await directRes.json();
      if (json.data && json.data.razonSocial) {
        return {
          success: true,
          ruc: json.data.ruc,
          doc: json.data.doc,
          dv: json.data.dv,
          razonSocial: json.data.razonSocial,
          estado: json.data.estado,
          esPersonaJuridica: json.data.esPersonaJuridica
        };
      }
      return {
        success: false,
        error: json.message || 'RUC no encontrado en el padrón de contribuyentes.'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: 'No se pudo conectar con el servicio de consulta RUC. Verifica tu conexión a internet.'
    };
  }

  return {
    success: false,
    error: 'No se encontraron datos para el RUC ingresado.'
  };
}
