/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Key, AlertCircle, CheckCircle2, Loader2, Sparkles, Smartphone, Laptop } from 'lucide-react';
import { validateLicenseInFirebase, getOrCreateDeviceId, normalizeLicenseKey } from '../lib/syncService';
import { AppLicense } from '../types';

interface LicenseModalProps {
  onLicenseActivated: (license: AppLicense) => void;
  initialKey?: string;
}

export default function LicenseModal({ onLicenseActivated, initialKey = '' }: LicenseModalProps) {
  const [licenseKeyInput, setLicenseKeyInput] = useState(initialKey);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const deviceId = getOrCreateDeviceId();

  const handleValidate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = normalizeLicenseKey(licenseKeyInput);
    if (!cleanKey) {
      setErrorMsg('Por favor ingrese una clave de licencia.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await validateLicenseInFirebase(cleanKey);
      if (result.valid && result.license) {
        setSuccessMsg(`¡Licencia activada con éxito para "${result.license.assignedTo}"!`);
        setTimeout(() => {
          onLicenseActivated(result.license!);
        }, 900);
      } else {
        setErrorMsg(result.message || 'La clave ingresada no es válida.');
      }
    } catch (err: any) {
      setErrorMsg('Error de conexión al validar la licencia. Verifique su acceso a internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="license-blocking-modal"
      className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 select-none overflow-y-auto"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 transition-all my-8">
        {/* Header con gradiente ámbar */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-tight">Activación de Software</h2>
          <p className="text-xs text-amber-100 mt-1 font-medium">
            Remix Control de Pagos • Licencia de Uso
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Protección y Verificación de Copia</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Para utilizar este sistema en su computadora o teléfono, ingrese la clave alfanumérica de licencia autorizada por el administrador.
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-slate-600 dark:text-slate-400">
              <Laptop className="w-3.5 h-3.5 text-slate-400" />
              <span>ID Dispositivo:</span>
              <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold text-slate-800 dark:text-slate-200">
                {deviceId}
              </span>
            </div>
          </div>

          <form onSubmit={handleValidate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Clave de Licencia
              </label>
              <div className="relative">
                <input
                  id="license-key-input"
                  type="text"
                  autoFocus
                  disabled={loading}
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                  placeholder="EJ: REMIX-2026-X9A7-B8C2"
                  className="w-full font-mono text-sm tracking-widest uppercase px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 dark:focus:border-amber-500 focus:outline-none transition-colors text-center font-bold"
                />
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 text-center">
                El formato no distingue entre mayúsculas y espacios.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              id="btn-activate-license"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando en Firebase...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Activar Licencia</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <p className="text-[10px] text-slate-600 dark:text-slate-400">
              ¿No dispone de una clave autorizada? Contacte a soporte o a su administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
