/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { UserSettings, UserAccount } from '../types';
import { TAB_LABELS } from '../utils/initialUsers';
import { 
  Sun, 
  Moon, 
  Shield, 
  Save, 
  Eye, 
  EyeOff, 
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
  AlertCircle,
  ChevronRight,
  Search,
  Sliders,
  ArrowLeft,
  ArrowRight,
  X,
  Laptop
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

export type SettingsSectionId = 
  | 'visual'
  | 'seguridad'
  | 'biometria'
  | 'usuarios'
  | 'actualizador'
  | 'mantenimiento'
  | 'todos';

interface SectionConfig {
  id: SettingsSectionId;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeText?: string;
  keywords: string[];
}

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
  // Navigation section state
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('visual');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Section definitions for lateral navigation column
  const sections: SectionConfig[] = useMemo(() => [
    {
      id: 'visual',
      label: 'Personalización Visual',
      shortDesc: 'Modo Claro y Modo Oscuro',
      icon: Sun,
      badgeText: darkMode ? 'Modo Oscuro' : 'Modo Claro',
      keywords: ['visual', 'personalizacion', 'tema', 'modo', 'claro', 'oscuro', 'color', 'apariencia', 'pantalla']
    },
    {
      id: 'seguridad',
      label: 'Seguridad y Autenticación',
      shortDesc: 'Bloqueo, usuario y contraseña',
      icon: Shield,
      badgeText: passwordEnabled ? 'Protegido' : 'Desactivado',
      keywords: ['seguridad', 'autenticacion', 'bloqueo', 'contraseña', 'password', 'clave', 'usuario', 'admin']
    },
    {
      id: 'biometria',
      label: 'Huella y Biometría',
      shortDesc: 'Sensor biométrico para Teléfono / PC',
      icon: Fingerprint,
      badgeText: storedBiometric ? 'Activa' : 'Disponible',
      keywords: ['huella', 'dactilar', 'biometria', 'biometrico', 'sensor', 'telefono', 'movil', 'login']
    },
    {
      id: 'usuarios',
      label: 'Usuarios y Permisos',
      shortDesc: 'Gestión de roles y acceso a pestañas',
      icon: Users,
      badgeText: `${users.length} ${users.length === 1 ? 'usuario' : 'usuarios'}`,
      keywords: ['usuarios', 'permisos', 'roles', 'accesos', 'cuentas', 'pestañas', 'empleados', 'vendedores']
    },
    {
      id: 'actualizador',
      label: 'Actualizaciones del Sistema',
      shortDesc: 'Instaladores (.exe / .apk) y versiones',
      icon: Sparkles,
      badgeText: `v${CURRENT_APP_VERSION}`,
      keywords: ['actualizaciones', 'actualizador', 'version', 'versiones', 'descargas', 'instalador', 'exe', 'apk', 'github']
    },
    {
      id: 'mantenimiento',
      label: 'Base de Datos y Mantenimiento',
      shortDesc: 'Vaciar facturas o restablecer de fábrica',
      icon: Database,
      badgeText: 'Mantenimiento',
      keywords: ['mantenimiento', 'base de datos', 'facturas', 'vaciar', 'eliminar', 'restablecer', 'fabrica', 'reset']
    }
  ], [darkMode, passwordEnabled, storedBiometric, users.length]);

  // Filtered sections when searching
  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(sec => 
      sec.label.toLowerCase().includes(q) ||
      sec.shortDesc.toLowerCase().includes(q) ||
      sec.keywords.some(k => k.includes(q))
    );
  }, [sections, searchQuery]);

  // Navigation helpers
  const sectionOrder: SettingsSectionId[] = ['visual', 'seguridad', 'biometria', 'usuarios', 'actualizador', 'mantenimiento'];
  const currentIndex = sectionOrder.indexOf(activeSection);
  const prevSectionId = currentIndex > 0 ? sectionOrder[currentIndex - 1] : null;
  const nextSectionId = currentIndex >= 0 && currentIndex < sectionOrder.length - 1 ? sectionOrder[currentIndex + 1] : null;

  const currentSectionConfig = sections.find(s => s.id === activeSection);

  return (
    <div className="w-full max-w-7xl mx-auto flex-1 min-h-0 flex flex-col">
      
      {/* Global Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded-xl text-sm border flex items-center justify-between gap-2 animate-fade-in shadow-xs shrink-0 ${
          notification.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            : notification.type === 'info'
            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="font-medium text-xs sm:text-sm">{notification.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TWO-COLUMN INDEPENDENT LAYOUT: Lateral Column (Fija 100%) + Content Column (Scroll Exclusivo) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 min-h-0">
        
        {/* ========================================================================= */}
        {/* COLUMNA LATERAL FIJA: Menú de Acceso a Ajustes por Nombre */}
        {/* ========================================================================= */}
        <aside className="w-full lg:w-84 xl:w-96 shrink-0 lg:h-full lg:overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            
            {/* Lateral Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs font-display uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Categorías de Ajustes
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">
                {sections.length} secciones
              </span>
            </div>

            {/* Quick Filter Search Bar */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar ajuste por nombre..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Section Buttons List */}
            <nav className="p-2 space-y-1.5">
              {filteredSections.map((sec) => {
                const Icon = sec.icon;
                const isSelected = activeSection === sec.id;

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSection(sec.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-center gap-3 group border ${
                      isSelected
                        ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/40 dark:border-amber-500/40 text-amber-950 dark:text-amber-200 shadow-xs'
                        : 'bg-transparent border-transparent hover:bg-slate-100/80 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:text-amber-500 dark:group-hover:text-amber-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-xs font-bold leading-snug ${
                          isSelected ? 'text-amber-900 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {sec.label}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          isSelected
                            ? 'text-amber-600 dark:text-amber-400 translate-x-0.5'
                            : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-500'
                        }`} />
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {sec.shortDesc}
                        </span>
                        {sec.badgeText && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500/30 text-amber-900 dark:text-amber-200'
                              : 'bg-slate-100 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                          }`}>
                            {sec.badgeText}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredSections.length === 0 && (
                <div className="text-center py-6 px-4 text-slate-400 text-xs">
                  No se encontraron ajustes con "{searchQuery}".
                </div>
              )}
            </nav>

            {/* Lateral Column Footer Info */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] font-medium">
                  Usuario: <strong className="text-slate-700 dark:text-slate-200">{currentUser?.username || settings.username || 'admin'}</strong>
                </span>
              </div>
              <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded font-bold">
                v{CURRENT_APP_VERSION}
              </span>
            </div>

          </div>

          {/* Quick Help Card */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-slate-800/60 border border-amber-200/70 dark:border-slate-700 text-xs space-y-1 text-slate-700 dark:text-slate-300">
            <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Navegación Rápida
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Haz clic en cualquiera de las opciones de la columna lateral para abrir y configurar sus opciones en la columna de al lado sin tener que desplazarte hacia abajo.
            </p>
          </div>

        </aside>

        {/* ========================================================================= */}
        {/* COLUMNA SIGUIENTE: Contenido del Ajuste Seleccionado (Scroll Independiente) */}
        {/* ========================================================================= */}
        <main className="flex-1 min-w-0 w-full lg:h-full lg:overflow-y-auto space-y-6 pr-1 lg:pr-3 pb-12 scrollbar-thin">
          
          {/* Header of the Active Section (if not in "todos" mode) */}
          {activeSection !== 'todos' && currentSectionConfig && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <currentSectionConfig.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Ajustes del Sistema
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-xs text-slate-500 font-medium">{currentSectionConfig.label}</span>
                  </div>
                  <h3 className="text-lg font-bold font-display text-slate-800 dark:text-slate-100">
                    {currentSectionConfig.label}
                  </h3>
                </div>
              </div>

              {/* Prev / Next Category Quick Arrows */}
              <div className="flex items-center gap-1.5 ml-auto">
                {prevSectionId && (
                  <button
                    type="button"
                    onClick={() => setActiveSection(prevSectionId)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Ajuste anterior"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>
                )}
                {nextSectionId && (
                  <button
                    type="button"
                    onClick={() => setActiveSection(nextSectionId)}
                    className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    title="Siguiente ajuste"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECCIÓN 1: Personalización Visual (Modo Claro / Oscuro) */}
          {/* ========================================================= */}
          {(activeSection === 'visual' || activeSection === 'todos') && (
            <div id="section-visual" className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <Sun className="w-5 h-5 text-yellow-400" />
                  <div>
                    <h3 className="font-bold text-sm tracking-tight font-display">Personalización Visual</h3>
                    <p className="text-xs text-slate-500">Selecciona el tema de apariencia adecuado para tu pantalla</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {darkMode ? 'Modo Oscuro' : 'Modo Claro'}
                </span>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Seleccionar Apariencia</p>
                    <p className="text-xs text-slate-500">Elija el modo visual adecuado para trabajar cómodamente.</p>
                  </div>
                  
                  <div className="flex bg-slate-200/80 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-300 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleUpdateTheme(false)}
                      className={`py-2 px-4 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                        !darkMode
                          ? 'bg-white text-slate-950 shadow-md'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
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
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-blue-400" />
                      Modo Oscuro
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      Ventajas Modo Claro
                    </p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Ideal para ambientes iluminados, oficinas y lectura de comprobantes impresos o listas extensas.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-blue-400" />
                      Ventajas Modo Oscuro
                    </p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Reduce la fatiga ocular por las noches y ahorra batería en pantallas OLED de teléfonos móviles.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECCIÓN 2: Seguridad y Autenticación */}
          {/* ========================================================= */}
          {(activeSection === 'seguridad' || activeSection === 'todos') && (
            <div id="section-seguridad" className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-sm tracking-tight font-display">Seguridad y Autenticación</h3>
                    <p className="text-xs text-slate-500">Configuración de credenciales y bloqueo del sistema</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  passwordEnabled 
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {passwordEnabled ? 'Bloqueo Activo' : 'Sin Bloqueo'}
                </span>
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
                      Nombre de Usuario Principal
                    </label>
                    <input
                      id="settings-username-input"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
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
                        className={`w-full px-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-amber-500 ${
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
                          className="absolute right-3 top-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
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
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios de Seguridad</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECCIÓN 3: Huella Dactilar y Biometría Móvil / PC */}
          {/* ========================================================= */}
          {(activeSection === 'biometria' || activeSection === 'todos') && (
            <div id="section-biometria" className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden text-left">
              <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight font-display flex items-center gap-2">
                      Huella Dactilar y Biometría Móvil / PC
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
                        <p className="font-bold">Inicio de sesión biométrico para tu Teléfono o Computadora</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Registra el sensor de huella de este equipo para no tener que escribir tu usuario y contraseña cada vez que abras el sistema.
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
          )}

          {/* ========================================================= */}
          {/* SECCIÓN 4: Gestión de Usuarios y Permisos */}
          {/* ========================================================= */}
          {(activeSection === 'usuarios' || activeSection === 'todos') && (
            <div id="section-usuarios" className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden text-left">
              <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 flex-wrap gap-2">
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
                        <div key={u.id} className="py-3 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
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
          )}

          {/* ========================================================= */}
          {/* SECCIÓN 5: Actualizador Automático y Versiones */}
          {/* ========================================================= */}
          {(activeSection === 'actualizador' || activeSection === 'todos') && (
            <div id="section-actualizador">
              <AutoUpdaterSection onNotify={setNotification} />
            </div>
          )}

          {/* ========================================================= */}
          {/* SECCIÓN 6: Base de Datos y Mantenimiento */}
          {/* ========================================================= */}
          {(activeSection === 'mantenimiento' || activeSection === 'todos') && (
            <div id="section-mantenimiento" className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden text-left">
              <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 px-5 py-4 flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-700">
                <Database className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-sm tracking-tight font-display">Mantenimiento de Base de Datos</h3>
                  <p className="text-xs text-slate-500">Operaciones de limpieza, reinicio de datos y estado inicial</p>
                </div>
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
          )}

          {/* Footer Version */}
          <div className="text-center py-4 select-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold border border-slate-200 dark:border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Control de Pagos — Versión {CURRENT_APP_VERSION}
            </span>
          </div>

        </main>

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

    </div>
  );
}
