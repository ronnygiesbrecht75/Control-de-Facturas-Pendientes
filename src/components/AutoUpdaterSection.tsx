/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  CURRENT_APP_VERSION, 
  getUpdateConfig, 
  saveUpdateConfig, 
  checkForAppUpdates, 
  simulateNewVersionCheck,
  UpdateInfo, 
  UpdateConfig 
} from '../utils/autoUpdater';
import { 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ExternalLink, 
  Settings2, 
  ShieldCheck, 
  Zap,
  Laptop,
  Smartphone,
  ChevronRight,
  Info,
  Clock
} from 'lucide-react';

interface AutoUpdaterSectionProps {
  onNotify?: (notification: { type: 'success' | 'error' | 'info'; message: string }) => void;
}

export default function AutoUpdaterSection({ onNotify }: AutoUpdaterSectionProps) {
  const [config, setConfig] = useState<UpdateConfig>(getUpdateConfig());
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [updateResult, setUpdateResult] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [customRepo, setCustomRepo] = useState<string>(config.githubRepo);

  const handleCheckUpdates = async (forceSimulate = false) => {
    setIsChecking(true);
    setDownloadProgress(null);
    try {
      let info: UpdateInfo;
      if (forceSimulate) {
        info = simulateNewVersionCheck('1.3.0');
      } else {
        info = await checkForAppUpdates(customRepo);
      }
      setUpdateResult(info);

      if (info.hasUpdate) {
        onNotify?.({
          type: 'info',
          message: `🎉 ¡Nueva actualización disponible: v${info.latestVersion}!`
        });
      } else {
        onNotify?.({
          type: 'success',
          message: 'Tu aplicación ya se encuentra en la versión más reciente.'
        });
      }
    } catch (err: any) {
      onNotify?.({
        type: 'error',
        message: 'No se pudo comprobar la actualización en este momento.'
      });
    } finally {
      setIsChecking(false);
      setConfig(getUpdateConfig());
    }
  };

  const handleToggleAutoCheck = (enabled: boolean) => {
    const updated = saveUpdateConfig({ autoCheckOnStartup: enabled });
    setConfig(updated);
    onNotify?.({
      type: 'success',
      message: enabled
        ? 'Búsqueda automática de actualizaciones activada al iniciar.'
        : 'Búsqueda automática desactivada.'
    });
  };

  const handleSaveRepo = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveUpdateConfig({ githubRepo: customRepo.trim() });
    setConfig(updated);
    onNotify?.({
      type: 'success',
      message: 'Repositorio de actualizaciones guardado correctamente.'
    });
  };

  const handleStartDownload = (assetUrl?: string) => {
    setIsDownloading(true);
    setDownloadProgress(0);

    // Simulate smooth download progress
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev === null) return 10;
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
          onNotify?.({
            type: 'success',
            message: 'Descarga completada. El instalador se ejecutará automáticamente.'
          });
          if (assetUrl && assetUrl !== '#') {
            window.open(assetUrl, '_blank');
          }
          return 100;
        }
        return prev + 15;
      });
    }, 300);
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return 'Nunca comprobado';
    try {
      const d = new Date(isoStr);
      return `${d.toLocaleDateString('es-PY')} a las ${d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Actualizador Automático del Sistema
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                v{CURRENT_APP_VERSION}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mantén el sistema al día con las últimas funciones, seguridad y mejoras de rendimiento
            </p>
          </div>
        </div>

        {/* Check Button */}
        <button
          type="button"
          onClick={() => handleCheckUpdates(false)}
          disabled={isChecking}
          className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Buscando Actualizaciones...' : 'Buscar Actualizaciones'}</span>
        </button>
      </div>

      <div className="p-5 space-y-5">
        
        {/* Status card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Current Version Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Versión Instalada
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">
                  v{CURRENT_APP_VERSION}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Activa
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500 space-y-0.5">
              <span className="block text-[10px] text-slate-400">Canal:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                {config.channel === 'stable' ? 'Estable (Oficial)' : 'Beta'}
              </span>
            </div>
          </div>

          {/* Last Checked Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Última Comprobación
              </span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(config.lastChecked)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCheckUpdates(true)}
              title="Simular nueva versión disponible para pruebas"
              className="text-[10px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Demo v1.3
            </button>
          </div>

        </div>

        {/* Update Check Result Banner */}
        {updateResult && (
          <div className="animate-fade-in">
            {updateResult.hasUpdate ? (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-500/40 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-md">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                        ¡Nueva Versión Disponible!
                      </span>
                      <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                        {updateResult.releaseName}
                      </h4>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-amber-500 text-slate-950 px-2.5 py-1 rounded-full shadow-xs">
                    v{updateResult.latestVersion}
                  </span>
                </div>

                {/* Release notes highlights */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Novedades de esta actualización:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {updateResult.releaseNotes.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Download Progress Bar if downloading */}
                {isDownloading && downloadProgress !== null && (
                  <div className="space-y-1.5 bg-slate-900 text-white p-3 rounded-xl">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Descargando actualización...</span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${downloadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleStartDownload(updateResult.assets[0]?.downloadUrl)}
                    disabled={isDownloading}
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloading ? 'Descargando...' : `Descargar e Instalar v${updateResult.latestVersion}`}</span>
                  </button>

                  <a
                    href={updateResult.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Ver en GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setUpdateResult(null)}
                    className="py-2.5 px-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 text-xs font-semibold cursor-pointer"
                  >
                    Recordar más tarde
                  </button>
                </div>

              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                    ¡Tu sistema está completamente al día!
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Estás ejecutando la versión más reciente (v{CURRENT_APP_VERSION}) con todas las funciones activas.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Automatic updates preferences */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
          
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Comprobar Actualizaciones al Iniciar
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                La aplicación verificará silenciosamente si hay nuevas versiones publicadas cada vez que se abra.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => handleToggleAutoCheck(!config.autoCheckOnStartup)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                config.autoCheckOnStartup ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.autoCheckOnStartup ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Advanced toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Ocultar opciones avanzadas' : 'Configuración avanzada del repositorio'}</span>
            </button>

            {showAdvanced && (
              <form onSubmit={handleSaveRepo} className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="github-repo-input">
                    Repositorio de GitHub (usuario/repositorio):
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="github-repo-input"
                      type="text"
                      value={customRepo}
                      onChange={(e) => setCustomRepo(e.target.value)}
                      placeholder="ronnygiesbrecht75/control-de-pagos"
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Define la fuente oficial desde donde se consultarán los paquetes e instaladores.
                  </span>
                </div>
              </form>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
