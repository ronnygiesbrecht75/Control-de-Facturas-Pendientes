/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, ArrowRight, X, Download } from 'lucide-react';
import { UpdateInfo } from '../utils/autoUpdater';

interface UpdateNotificationToastProps {
  updateInfo: UpdateInfo;
  onOpenUpdater: () => void;
  onDismiss: () => void;
}

export default function UpdateNotificationToast({
  updateInfo,
  onOpenUpdater,
  onDismiss
}: UpdateNotificationToastProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-fade-in">
      <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border-2 border-amber-500/80 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-sm flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                Actualización Disponible
              </span>
              <h4 className="text-xs font-black text-slate-100">
                Nueva versión v{updateInfo.latestVersion}
              </h4>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-300 leading-tight">
          Hay una nueva versión de Control de Pagos lista para descargar con mejoras de velocidad y nuevas funciones.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onOpenUpdater();
              onDismiss();
            }}
            className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ver y Actualizar</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="py-2 px-2.5 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Más tarde
          </button>
        </div>
      </div>
    </div>
  );
}
