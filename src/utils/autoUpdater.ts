/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CURRENT_APP_VERSION = '1.2.0';

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
  githubRepo: 'ronnygiesbrecht75/control-de-pagos',
  lastChecked: null,
  ignoredVersion: null,
};

const STORAGE_KEY = 'pagos_app_update_config';

export function getUpdateConfig(): UpdateConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading update configuration:', e);
  }
  return DEFAULT_CONFIG;
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
  const repo = customRepo || config.githubRepo || 'ronnygiesbrecht75/control-de-pagos';
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
      'Sistema actualizado a la versión más reciente.',
      'Módulo de Cobro Repartidor Móvil con Micrófono Inteligente.',
      'Soporte para Planillas de Facturas y Clientes de Paraguay (PYG).'
    ],
    htmlUrl: `https://github.com/${repo}/releases`,
    assets: []
  };
}

// Simulates an update check for testing / demo purposes
export function simulateNewVersionCheck(simulatedVersion: string = '1.3.0'): UpdateInfo {
  return {
    hasUpdate: isNewerVersion(simulatedVersion, CURRENT_APP_VERSION),
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: simulatedVersion,
    releaseName: `Control de Pagos v${simulatedVersion} - Actualización Disponible`,
    releaseDate: new Date().toISOString(),
    releaseNotes: [
      '🚀 Nuevo asistente de dictado por voz paraguayo con Gemini IA.',
      '⚡ Botón de cobro directo sin confirmación intermedia.',
      '📊 Exportación en PDF y Excel mejorada con logo corporativo.',
      '🔒 Mayor seguridad en sesiones con autenticación biométrica.',
      '🛠️ Optimización general de rendimiento y menor consumo de memoria.'
    ],
    htmlUrl: 'https://github.com/ronnygiesbrecht75/control-de-pagos/releases',
    assets: [
      {
        name: `ControlDePagos-Setup-${simulatedVersion}.exe`,
        downloadUrl: '#',
        size: 78500000,
        type: 'windows'
      },
      {
        name: `ControlDePagos-v${simulatedVersion}.apk`,
        downloadUrl: '#',
        size: 34200000,
        type: 'android'
      }
    ]
  };
}
