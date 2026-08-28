/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CURRENT_APP_VERSION = '1.4.0';

export interface ReleaseAsset {
  name: string;
  downloadUrl: string;
  size?: number;
  type: 'windows' | 'android' | 'web' | 'other';
}

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseDate: string;
  releaseNotes: string[];
  htmlUrl: string;
  assets: ReleaseAsset[];
  isPreRelease?: boolean;
}

export interface UpdateConfig {
  autoCheckOnStartup: boolean;
  channel: 'stable' | 'beta';
  githubRepo: string; // e.g. "ronnygiesbrecht75/control-de-pagos"
  lastChecked: string | null;
  ignoredVersion: string | null;
}

const DEFAULT_CONFIG: UpdateConfig = {
  autoCheckOnStartup: true,
  channel: 'stable',
  githubRepo: 'ronnygiesbrecht75/Control-de-Facturas-Pendientes',
  lastChecked: null,
  ignoredVersion: null,
};

const STORAGE_KEY = 'pagos_app_update_config';

export function getUpdateConfig(): UpdateConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Auto-migrate if it still pointed to the old repo name
      if (!parsed.githubRepo || parsed.githubRepo.toLowerCase() === 'ronnygiesbrecht75/control-de-pagos') {
        parsed.githubRepo = 'ronnygiesbrecht75/Control-de-Facturas-Pendientes';
      }
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Error loading update configuration:', e);
  }
  return DEFAULT_CONFIG;
}

export type PlatformType = 'windows' | 'android' | 'other';

export function detectCurrentPlatform(): PlatformType {
  if (typeof navigator === 'undefined') return 'windows';
  const ua = (navigator.userAgent || '').toLowerCase();
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'other';
  // Default to Windows / PC desktop
  return 'windows';
}

export function getRecommendedAsset(assets: ReleaseAsset[]): ReleaseAsset | undefined {
  if (!assets || assets.length === 0) return undefined;
  const platform = detectCurrentPlatform();

  if (platform === 'windows') {
    // Look specifically for Windows executable (.exe or .msi)
    const exe = assets.find(a => a.type === 'windows' || a.name.toLowerCase().endsWith('.exe') || a.name.toLowerCase().endsWith('.msi'));
    if (exe) return exe;
  } else if (platform === 'android') {
    // Look specifically for Android APK
    const apk = assets.find(a => a.type === 'android' || a.name.toLowerCase().endsWith('.apk'));
    if (apk) return apk;
  }

  // Fallback: If on PC / unknown desktop, prefer .exe if available
  const winAsset = assets.find(a => a.type === 'windows' || a.name.toLowerCase().endsWith('.exe'));
  if (winAsset) return winAsset;

  return assets[0];
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function saveUpdateConfig(config: Partial<UpdateConfig>): UpdateConfig {
  const current = getUpdateConfig();
  const updated = { ...current, ...config };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving update configuration:', e);
  }
  return updated;
}

// Clean and parse semver string (e.g. "v1.2.0" -> [1, 2, 0])
export function parseSemver(version: string): number[] {
  const clean = version.trim().replace(/^v/i, '');
  const parts = clean.split('-')[0].split('.').map(p => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

// Compare if remote is strictly newer than current
export function isNewerVersion(remote: string, current: string): boolean {
  const [rMaj, rMin, rPatch] = parseSemver(remote);
  const [cMaj, cMin, cPatch] = parseSemver(current);

  if (rMaj > cMaj) return true;
  if (rMaj < cMaj) return false;
  if (rMin > cMin) return true;
  if (rMin < cMin) return false;
  return rPatch > cPatch;
}

// Check for updates against GitHub Releases API or fallback server
export async function checkForAppUpdates(customRepo?: string): Promise<UpdateInfo> {
  const config = getUpdateConfig();
  const repo = customRepo || config.githubRepo || 'ronnygiesbrecht75/Control-de-Facturas-Pendientes';
  const nowStr = new Date().toISOString();

  // Save last checked timestamp
  saveUpdateConfig({ lastChecked: nowStr });

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.ok) {
      const releaseData = await response.json();
      const tagName = releaseData.tag_name || releaseData.name || CURRENT_APP_VERSION;
      const cleanTag = tagName.replace(/^v/i, '');
      const hasUpdate = isNewerVersion(cleanTag, CURRENT_APP_VERSION);

      // Parse release notes lines
      const bodyText = releaseData.body || '';
      const releaseNotes = bodyText
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && !line.startsWith('#'));

      const assets: ReleaseAsset[] = (releaseData.assets || []).map((ast: any) => {
        let type: ReleaseAsset['type'] = 'other';
        const name = ast.name || '';
        if (name.endsWith('.exe') || name.endsWith('.msi')) type = 'windows';
        else if (name.endsWith('.apk')) type = 'android';
        else if (name.endsWith('.zip') || name.endsWith('.tar.gz')) type = 'web';

        return {
          name: ast.name,
          downloadUrl: ast.browser_download_url,
          size: ast.size,
          type
        };
      });

      return {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: cleanTag,
        releaseName: releaseData.name || `Versión ${cleanTag}`,
        releaseDate: releaseData.published_at || releaseData.created_at || nowStr,
        releaseNotes: releaseNotes.length > 0 ? releaseNotes : [
          'Mejoras en el rendimiento general',
          'Soporte optimizado para cobro por voz con IA',
          'Corrección de errores y estabilidad'
        ],
        htmlUrl: releaseData.html_url || `https://github.com/${repo}/releases`,
        assets,
        isPreRelease: !!releaseData.prerelease
      };
    }
  } catch (err) {
    console.warn('GitHub API check failed or offline, returning fallback info:', err);
  }

  // Fallback / standard response when app is up-to-date or offline
  return {
    hasUpdate: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
    releaseName: `Control de Pagos v${CURRENT_APP_VERSION} (Al Día)`,
    releaseDate: nowStr,
    releaseNotes: [
      'Versión v1.4.0 instalada y operativa.',
      'Soporte completo y descarga diferenciada automática de instaladores (.exe para PC y .apk para móviles).',
      'Carga inteligente de cobros con IA (Gemini): dictado por voz y asistente por teclado.',
      'Diagnóstico interactivo y guía paso a paso para permisos de micrófono.',
      'Soporte completo para facturas y montos en Guaraníes (PYG).',
      'Módulo de Cobro Repartidor Móvil con registro directo.'
    ],
    htmlUrl: `https://github.com/${repo}/releases`,
    assets: [
      {
        name: `Control.de.Pagos.Setup.${CURRENT_APP_VERSION}.exe`,
        downloadUrl: `https://github.com/${repo}/releases/download/v${CURRENT_APP_VERSION}/Control.de.Pagos.Setup.${CURRENT_APP_VERSION}.exe`,
        size: 136360498,
        type: 'windows'
      },
      {
        name: `Control-de-Pagos-v${CURRENT_APP_VERSION}.apk`,
        downloadUrl: `https://github.com/${repo}/releases/download/v${CURRENT_APP_VERSION}/Control-de-Pagos-v${CURRENT_APP_VERSION}.apk`,
        size: 9732214,
        type: 'android'
      }
    ]
  };
}

// Simulates an update check for testing / demo purposes
export function simulateNewVersionCheck(simulatedVersion: string = '1.5.0'): UpdateInfo {
  return {
    hasUpdate: isNewerVersion(simulatedVersion, CURRENT_APP_VERSION),
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: simulatedVersion,
    releaseName: `Control de Pagos v${simulatedVersion} - Actualización Disponible`,
    releaseDate: new Date().toISOString(),
    releaseNotes: [
      '🚀 Próxima versión v1.5.0 en preparación.',
      '📊 Nuevos filtros avanzados de auditoría y estadísticas.',
      '🔄 Sincronización multi-dispositivo en tiempo real mejorada.',
      '🛠️ Optimización general de rendimiento y menor consumo de memoria.'
    ],
    htmlUrl: 'https://github.com/ronnygiesbrecht75/Control-de-Facturas-Pendientes/releases',
    assets: [
      {
        name: `Control.de.Pagos.Setup.${simulatedVersion}.exe`,
        downloadUrl: 'https://github.com/ronnygiesbrecht75/Control-de-Facturas-Pendientes/releases',
        size: 136360000,
        type: 'windows'
      },
      {
        name: `Control-de-Pagos-v${simulatedVersion}.apk`,
        downloadUrl: 'https://github.com/ronnygiesbrecht75/Control-de-Facturas-Pendientes/releases',
        size: 9730000,
        type: 'android'
      }
    ]
  };
}
