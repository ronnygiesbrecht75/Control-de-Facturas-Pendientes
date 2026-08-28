/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserSettings, UserAccount } from '../types';
import { TAB_LABELS } from '../utils/initialUsers';
import { 
  Sun, 
  Moon, 
  Shield, 
  Save, 
  Eye, 
  EyeOff, 
  Layout, 
  Database, 
  Trash2, 
  RotateCcw, 
  Users, 
  UserPlus, 
  Edit3, 
  ShieldCheck, 
  Check, 
  Lock,
  Fingerprint,
  Smartphone,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import UserModal from './UserModal';
import AutoUpdaterSection from './AutoUpdaterSection';
import { CURRENT_APP_VERSION } from '../utils/autoUpdater';
import { 
  isBiometricsSupported, 
  getStoredBiometrics, 
  registerBiometrics, 
  removeBiometrics, 
  StoredBiometricCredential 
} from '../utils/biometrics';

interface AjustesProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  users?: UserAccount[];
  currentUser?: UserAccount | null;
  onSaveUser?: (user: UserAccount) => void;
  onDeleteUser?: (userId: string) => void;
  onClearAllInvoices?: () => void;
  onResetApp?: () => void;
}

export default function Ajustes({
  settings,
  onUpdateSettings,
  users = [],
  currentUser,
  onSaveUser,
  onDeleteUser,
  onClearAllInvoices,
  onResetApp
}: AjustesProps) {
  // Local state copy
  const [darkMode, setDarkMode] = useState(settings.darkMode);
  const [username, setUsername] = useState(settings.username);
  const [passwordEnabled, setPasswordEnabled] = useState(settings.passwordEnabled);
  const [passwordValue, setPasswordValue] = useState(settings.passwordHash || '');
  
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmClearInvoices, setConfirmClearInvoices] = useState(false);
  const [confirmResetApp, setConfirmResetApp] = useState(false);

  // User Modal states
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);

  // Biometrics state
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [storedBiometric, setStoredBiometric] = useState<StoredBiometricCredential | null>(null);
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);

  useEffect(() => {
    isBiometricsSupported().then((supported) => {
      setBiometricsSupported(supported);
      setStoredBiometric(getStoredBiometrics());
    });
  }, []);

  const handleRegisterBiometrics = async () => {
    setIsRegisteringBio(true);
    try {
      const activeUser = currentUser || {
        id: 'admin',
        username: settings.username || 'admin',
        passwordHash: settings.passwordHash || '123456',
        role: 'admin',
        permissions: {
          'registrar-factura': true,
          'registrar-pagos': true,
          'cobro-movil': true,
          'facturas-pendientes': true,
          'facturas': true,
          'otras-facturas': true,
          'cristian-facturas': true,
          'clientes': true,
          'ajustes': true,
        }
      };

      const result = await registerBiometrics(activeUser);
      if (result.success && result.data) {
        setStoredBiometric(result.data);
        setNotification({ type: 'success', message: result.message });
      } else {
        setNotification({ type: 'error', message: result.message });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error al registrar huella' });
    } finally {
      setIsRegisteringBio(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleRemoveBiometrics = () => {
    removeBiometrics();
    setStoredBiometric(null);
    setNotification({ type: 'success', message: 'Huella dactilar desvinculada de este dispositivo.' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateTheme = (isDark: boolean) => {
    setDarkMode(isDark);
    onUpdateSettings({ darkMode: isDark });
    // Side effects on HTML layout class
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setNotification({ type: 'success', message: `Tema cambiado a modo ${isDark ? 'Oscuro' : 'Claro'}.` });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setNotification({ type: 'error', message: 'El nombre de usuario no puede estar vacío.' });
      return;
    }

    if (passwordEnabled) {
      if (passwordValue.length < 4) {
        setNotification({ type: 'error', message: 'La contraseña debe tener un mínimo de 4 caracteres.' });
        return;
      }
    }

    onUpdateSettings({
      username: username.trim(),
      passwordEnabled,
      passwordHash: passwordValue
    });

    setNotification({ type: 'success', message: 'Configuración de seguridad guardada con éxito.' });
    setTimeout(() => setNotification(null), 3500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      
      {/* Title */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold font-display text-slate-800 dark:text-slate-100">
          Ajustes de la Aplicación
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Ajuste temas visuales y configure políticas de restricciones para el acceso seguro de usuarios.
        </p>
      </div>

      {notification && (
        <div className={`p-4 rounded-lg text-sm border flex items-center gap-2 ${
          notification.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            : notification.type === 'info'
            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800'
        }`}>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Bloque 1: Modo Claro y Modo Oscuro */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 px-5 py-4 flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-700">
          <Sun className="w-5 h-5 text-yellow-400" />
          <h3 className="font-bold text-sm tracking-tight font-display">Personalización Visual</h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Seleccionar Apariencia</p>
              <p className="text-xs text-slate-500">Elija el modo visual adecuado para trabajar cómodamente.</p>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleUpdateTheme(false)}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                  !darkMode
                    ? 'bg-white text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Modo Claro
              </button>
              <button
                type="button"
                onClick={() => handleUpdateTheme(true)}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                Modo Oscuro
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bloque 2: Configurar Usuario y Contraseña */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 px-5 py-4 flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-700">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm tracking-tight font-display">Seguridad y Autenticación</h3>
        </div>

        <form onSubmit={handleSaveSecurity} className="p-6 space-y-5">
          
          {/* Lock screen toggle */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                Activar Bloqueo de Sistema
              </label>
              <span className="text-xs text-slate-500">
                Pide usuario y contraseña cada vez que abre el portal de Control de Pagos.
              </span>
            </div>
            
            <button
              id="toggle-auth-enabled-btn"
              type="button"
              onClick={() => setPasswordEnabled(!passwordEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                passwordEnabled ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  passwordEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username setting */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="settings-username-input">
                Nombre de Usuario
              </label>
              <input
                id="settings-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-1 focus:ring-primary-gold outline-none"
                placeholder="Ej. admin"
                required
              />
            </div>

            {/* Password value with visibility toggler */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="settings-password-input">
                Contraseña Administrativa
              </label>
              <div className="relative">
                <input
                  id="settings-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  disabled={!passwordEnabled}
                  className={`w-full px-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 outline-none focus:ring-1 focus:ring-primary-gold ${
                    passwordEnabled 
                      ? 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100' 
                      : 'bg-slate-200 dark:bg-slate-800 border-none text-slate-400 cursor-not-allowed'
                  }`}
                  placeholder={passwordEnabled ? 'Mínimo 4 caracteres' : 'Protección Desactivada'}
                  required={passwordEnabled}
                />
                {passwordEnabled && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Acepta letras, números y símbolos. Mínimo 4 caracteres.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="save-settings-security-btn"
              type="submit"
              className="w-full py-2 bg-slate-900 dark:bg-primary-gold hover:bg-slate-950 dark:hover:bg-primary-gold-dark text-white dark:text-slate-950 font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios de Seguridad
            </button>
          </div>

        </form>
      </div>

      {/* Bloque 2.3: Huella Dactilar y Biometría Móvil / PC */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden text-left">
        <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight font-display flex items-center gap-2">
                Huella Dactilar y Biometría Móvil
                {storedBiometric && (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                    Activa
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 font-normal">
                Permite iniciar sesión tocando el sensor de huella de tu teléfono o portátil.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {storedBiometric ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Huella Dactilar Vinculada
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Usuario asociado: <strong className="font-mono">{storedBiometric.username}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveBiometrics}
                  className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Desvincular Huella
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Al abrir la pantalla de bloqueo en este dispositivo, podrás pulsar el botón de huella para ingresar al instante sin digitar tu clave.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-300">
                <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Inicio de sesión biométrico para tu Teléfono</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Registra la huella de este teléfono para no tener que escribir tu usuario y contraseña cada vez que abras el sistema.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRegisterBiometrics}
                disabled={isRegisteringBio}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Fingerprint className={`w-4 h-4 ${isRegisteringBio ? 'animate-spin' : ''}`} />
                {isRegisteringBio ? 'Esperando sensor de huella...' : 'Registrar / Activar Huella en este Dispositivo'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bloque 2.5: Gestión de Usuarios y Permisos */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden text-left">
        <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-sm tracking-tight font-display">Gestión de Usuarios y Permisos</h3>
              <p className="text-[11px] text-slate-500 font-normal">
                Agregue usuarios y seleccione a qué pestañas del sistema tienen acceso.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingUser(null);
              setUserModalOpen(true);
            }}
            className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs font-display"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar Usuario</span>
          </button>
        </div>

        <div className="p-5 space-y-3">
          {users.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No hay usuarios adicionales registrados.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {users.map((u) => {
                const allowedTabsCount = Object.values(u.permissions || {}).filter(Boolean).length;
                const totalTabsCount = Object.keys(TAB_LABELS).length;
                const isAdmin = u.role === 'admin';

                return (
                  <div key={u.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        isAdmin 
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {u.username}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            isAdmin 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' 
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {isAdmin ? 'Administrador' : 'Usuario'}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {isAdmin ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">Acceso total (Todas las pestañas)</span>
                          ) : (
                            <span>
                              Permisos: <strong className="text-slate-700 dark:text-slate-300">{allowedTabsCount} de {totalTabsCount} pestañas</strong> habilitadas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser(u);
                          setUserModalOpen(true);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Editar permisos"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Editar Permisos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUserToDelete(u)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bloque 3: Actualizador Automático */}
      <AutoUpdaterSection onNotify={setNotification} />

      {/* Bloque 4: Mantenimiento y Datos */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden text-left">
        <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 px-5 py-4 flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-700">
          <Database className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-sm tracking-tight font-display">Mantenimiento de Base de Datos</h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Utilice estas herramientas antes de entregar la aplicación a su cliente o para iniciar una nueva temporada fiscal desde cero.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Vaciar facturas */}
            <div className="p-4 rounded-xl border border-rose-100 dark:border-rose-950/20 bg-rose-50/20 dark:bg-rose-950/5 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">
                  Vaciar Facturas Registradas
                </h4>
                <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                  Elimina todas las facturas de la base de datos de forma permanente. Los clientes precargados permanecerán intactos para facilitar la autocompletación.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmClearInvoices(true)}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Todas las Facturas
              </button>
            </div>

            {/* Restablecer app */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Restablecer Aplicación
                </h4>
                <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                  Limpia la base de datos de facturas, borra cualquier cliente nuevo agregado previamente y restablece la contraseña de administrador predeterminada (<code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">admin</code>).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmResetApp(true)}
                className="w-full py-2 px-3 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer Todo de Fábrica
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Clear Invoices */}
      <ConfirmModal
        isOpen={confirmClearInvoices}
        title="¿Eliminar TODAS las Facturas?"
        message="⚠️ ¿Estás seguro de que deseas eliminar TODAS las facturas cargadas de la base de datos? Esta acción no se puede deshacer."
        confirmText="Sí, Eliminar Todo"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (onClearAllInvoices) {
            onClearAllInvoices();
            setNotification({ type: 'success', message: 'Se han eliminado todas las facturas con éxito.' });
            setTimeout(() => setNotification(null), 4000);
          }
        }}
        onClose={() => setConfirmClearInvoices(false)}
      />

      {/* Confirmation Modal: Reset App */}
      <ConfirmModal
        isOpen={confirmResetApp}
        title="¿Restablecer Aplicación?"
        message="🚨 ¿Deseas restablecer la aplicación por completo a su estado inicial de fábrica? Se borrarán todas las modificaciones de facturas y seguridad."
        confirmText="Sí, Restablecer Fábrica"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (onResetApp) {
            onResetApp();
            setNotification({ type: 'success', message: 'La aplicación ha sido restablecida a su estado original de fábrica.' });
            setTimeout(() => {
              setNotification(null);
              window.location.reload();
            }, 1500);
          }
        }}
        onClose={() => setConfirmResetApp(false)}
      />

      {/* User Edit/Add Modal */}
      <UserModal
        isOpen={userModalOpen}
        userToEdit={editingUser}
        existingUsers={users}
        onSave={(updatedUser) => {
          if (onSaveUser) {
            onSaveUser(updatedUser);
            setNotification({
              type: 'success',
              message: `Usuario "${updatedUser.username}" guardado correctamente.`
            });
            setTimeout(() => setNotification(null), 3000);
          }
        }}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUser(null);
        }}
      />

      {/* Confirmation Modal for deleting user */}
      <ConfirmModal
        isOpen={!!userToDelete}
        title="¿Eliminar Usuario?"
        message={
          userToDelete
            ? `¿Está seguro de que desea eliminar al usuario "${userToDelete.username}"? Ya no podrá acceder al sistema.`
            : ''
        }
        confirmText="Sí, Eliminar Usuario"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (userToDelete && onDeleteUser) {
            onDeleteUser(userToDelete.id);
            setNotification({
              type: 'success',
              message: `Usuario "${userToDelete.username}" eliminado.`
            });
            setTimeout(() => setNotification(null), 3000);
            setUserToDelete(null);
          }
        }}
        onClose={() => setUserToDelete(null)}
      />

      {/* Footer Version */}
      <div className="text-center py-4 select-none">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold border border-slate-200 dark:border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Control de Pagos — Versión {CURRENT_APP_VERSION}
        </span>
      </div>

    </div>
  );
}
