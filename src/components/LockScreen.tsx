/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Lock, LogIn, Fingerprint, Sparkles, AlertCircle } from 'lucide-react';
import { UserSettings, UserAccount } from '../types';
import { allPermissionsTrue } from '../utils/initialUsers';
import { 
  isBiometricsSupported, 
  getStoredBiometrics, 
  authenticateWithBiometrics, 
  registerBiometrics, 
  StoredBiometricCredential 
} from '../utils/biometrics';
import { Capacitor } from '@capacitor/core';
import harvestBanner from '../assets/images/harvest_banner_image_1786485711438.jpg';

interface LockScreenProps {
  settings: UserSettings;
  users?: UserAccount[];
  onUnlockWithUser: (user: UserAccount) => void;
}

export default function LockScreen({ settings, users = [], onUnlockWithUser }: LockScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enableBiometricsOnLogin, setEnableBiometricsOnLogin] = useState(false);

  // Biometrics state
  const [supportsBiometrics, setSupportsBiometrics] = useState(false);
  const [storedBio, setStoredBio] = useState<StoredBiometricCredential | null>(null);
  const [isVerifyingBio, setIsVerifyingBio] = useState(false);
  const [bioNotice, setBioNotice] = useState<string | null>(null);

  useEffect(() => {
    isBiometricsSupported().then((supported) => {
      setSupportsBiometrics(supported);
      const bioData = getStoredBiometrics();
      setStoredBio(bioData);

      // Auto-trigger biometric prompt on native mobile startup
      if (supported && bioData && Capacitor.isNativePlatform()) {
        const timer = setTimeout(() => {
          handleBiometricUnlock();
        }, 400);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const handleBiometricUnlock = async () => {
    setError('');
    setBioNotice(null);
    setIsVerifyingBio(true);

    try {
      const result = await authenticateWithBiometrics(users);
      if (result.success && result.user) {
        onUnlockWithUser(result.user);
      } else {
        setError(result.message || 'No se pudo verificar la huella dactilar.');
      }
    } catch (err: any) {
      setError(err.message || 'Error en la lectura del sensor de huella.');
    } finally {
      setIsVerifyingBio(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();

    let authenticatedUser: UserAccount | null = null;

    // 1. Try matching against registered users
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === cleanUser && u.passwordHash === password
    );

    if (foundUser) {
      authenticatedUser = foundUser;
    } else {
      // 2. Fallback matching settings admin
      const cleanSavedUser = settings.username.trim().toLowerCase();
      if (cleanUser === cleanSavedUser && password === settings.passwordHash) {
        authenticatedUser = {
          id: 'admin-fallback',
          username: settings.username,
          passwordHash: settings.passwordHash || '123456',
          role: 'admin',
          permissions: { ...allPermissionsTrue }
        };
      }
    }

    if (authenticatedUser) {
      if (enableBiometricsOnLogin) {
        try {
          await registerBiometrics(authenticatedUser);
        } catch (err) {
          console.warn('Error saving biometrics on login', err);
        }
      }
      onUnlockWithUser(authenticatedUser);
      return;
    }

    setError('Usuario o contraseña incorrectos. Revisa e intenta de nuevo.');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Background Image Covering Entire Startup Screen */}
      <img 
        src={harvestBanner} 
        alt="Fondo de Pantalla" 
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      {/* Dark overlay for optimal readability */}
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px]" />

      {/* Login Screen Card floating in front */}
      <div className="relative z-10 w-full max-w-md bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/80 overflow-hidden transform transition-all duration-300">
        
        {/* Card Header */}
        <div className="bg-slate-950/90 p-5 border-b border-amber-500/20 flex items-center justify-between">
          <h1 className="text-2xl font-black font-display tracking-tight text-white drop-shadow">
            Control de Pagos
          </h1>
          <div className="w-9 h-9 bg-amber-400/20 rounded-full flex items-center justify-center border border-amber-400/40 shrink-0">
            <Lock className="w-4 h-4 text-amber-300" />
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Sistema Protegido
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ingrese con huella dactilar o con sus credenciales para continuar.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs p-3 rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {bioNotice && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{bioNotice}</span>
            </div>
          )}

          {/* Quick Biometric Unlock Option */}
          {storedBio && (
            <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 text-center space-y-2.5">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Fingerprint className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                <span>Acceso Rápido con Huella</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Huella vinculada al usuario: <strong className="text-slate-900 dark:text-slate-100 font-mono">{storedBio.username}</strong>
              </p>

              <button
                type="button"
                id="btn-biometric-unlock"
                onClick={handleBiometricUnlock}
                disabled={isVerifyingBio}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
              >
                <Fingerprint className={`w-5 h-5 ${isVerifyingBio ? 'animate-spin' : ''}`} />
                {isVerifyingBio ? 'Escaneando Huella...' : 'Tocar Sensor para Desbloquear'}
              </button>
            </div>
          )}

          {storedBio && (
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-700 w-full" />
              <span className="bg-white dark:bg-slate-800 px-3 text-[11px] uppercase tracking-wider text-slate-400 shrink-0">
                O con usuario y contraseña
              </span>
              <div className="border-t border-slate-200 dark:border-slate-700 w-full" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Usuario
              </label>
              <input
                id="lock-username-input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold focus:border-transparent text-sm transition-colors duration-150"
                placeholder="Introduzca su usuario"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Contraseña
              </label>
              <input
                id="lock-password-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold focus:border-transparent text-sm transition-colors duration-150"
                placeholder="******"
                required
              />
            </div>

            {/* Checkbox to link fingerprint */}
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={enableBiometricsOnLogin}
                onChange={(e) => setEnableBiometricsOnLogin(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 dark:border-slate-600"
              />
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-amber-500" />
                Vincular huella dactilar de este dispositivo
              </span>
            </label>

            <button
              id="lock-unlock-btn"
              type="submit"
              className="w-full py-2.5 bg-primary-gold hover:bg-primary-gold-dark text-slate-950 font-semibold rounded-lg shadow-md transition-colors duration-150 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Acceder al Sistema
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

