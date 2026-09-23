/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lock, ShieldAlert, X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { UserSettings, UserAccount } from '../types';

interface ResetFactoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  users?: UserAccount[];
  settings: UserSettings;
  onConfirmReset: () => Promise<void>;
}

export default function ResetFactoryModal({
  isOpen,
  onClose,
  currentUser,
  users = [],
  settings,
  onConfirmReset
}: ResetFactoryModalProps) {
  const [step, setStep] = useState<'prompt' | 'password'>('prompt');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset internal state when opened or closed
  useEffect(() => {
    if (isOpen) {
      setStep('prompt');
      setPassword('');
      setShowPassword(false);
      setError('');
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Identify admin username to display
  const adminAccount = users.find((u) => u.role === 'admin');
  const displayAdminName = currentUser?.role === 'admin' 
    ? currentUser.username 
    : adminAccount?.username || settings.username || 'admin';

  const handleStepPromptAccept = () => {
    setError('');
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPassword = password.trim();
    if (!cleanPassword) {
      setError('Debes ingresar la contraseña de Administrador.');
      return;
    }

    // Verify if entered password matches any valid Administrator
    const isCurrentAdmin = currentUser?.role === 'admin' && currentUser.passwordHash === cleanPassword;
    const isRegisteredAdmin = users.some(
      (u) => u.role === 'admin' && u.passwordHash === cleanPassword
    );
    const isSettingsAdmin = 
      (settings.passwordHash && settings.passwordHash === cleanPassword) || 
      (!settings.passwordHash && cleanPassword === 'admin');

    const isAuthorized = isCurrentAdmin || isRegisteredAdmin || isSettingsAdmin;

    if (!isAuthorized) {
      setError('Contraseña incorrecta. Solo un usuario Administrador puede autorizar el restablecimiento.');
      return;
    }

    // Authorized - execute factory reset
    setIsProcessing(true);
    try {
      await onConfirmReset();
    } catch (err: any) {
      setError(err?.message || 'Error al restablecer la base de datos.');
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5 transform transition-all scale-100 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: INITIAL PROMPT (¿Aceptar?) */}
        {step === 'prompt' && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl flex-shrink-0 bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1 pr-6">
                <h3 className="text-base font-bold font-display text-slate-900 dark:text-slate-100">
                  ¿Restablecer Todo de Fábrica?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Esta acción es irreversible y limpiará por completo el sistema para entregar al cliente o iniciar de cero.
                </p>
              </div>
            </div>

            <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 rounded-xl p-3.5 space-y-1.5 text-xs text-rose-900 dark:text-rose-200">
              <p className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                Se borrará lo siguiente:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700 dark:text-slate-300 pl-1">
                <li><strong>Todas las facturas y remisiones</strong> (local y en la nube).</li>
                <li><strong>Todos los clientes guardados</strong> (el directorio quedará en 0).</li>
                <li>La contraseña de administrador volverá a ser <strong>admin</strong>.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStepPromptAccept}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                Aceptar y Continuar
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REQUIRE ADMINISTRATOR PASSWORD */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl flex-shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1 pr-6">
                <h3 className="text-base font-bold font-display text-slate-900 dark:text-slate-100">
                  Seguridad de Administrador
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Para evitar accidentes, ingresa la contraseña del <strong>Administrador</strong> para autorizar el restablecimiento de fábrica.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Usuario Administrador: </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{displayAdminName}</span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Contraseña de Administrador
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                  placeholder="Introduce la contraseña para confirmar..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('prompt')}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Atrás
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Restableciendo todo...</span>
                  </>
                ) : (
                  <span>Confirmar Restablecimiento</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
