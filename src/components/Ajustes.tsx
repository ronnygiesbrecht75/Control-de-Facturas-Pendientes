/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { UserSettings, UserAccount, AppLicense } from '../types';
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
  X,
  Laptop,
  Key,
  Plus,
  Copy,
  RefreshCw,
  Power,
  Calendar,
  Building2,
  Share2,
  CheckCheck,
  Cloud,
  CloudUpload,
  FileSpreadsheet
} from 'lucide-react';
import { 
  saveLicenseToCloud, 
  subscribeAllLicenses, 
  toggleLicenseActiveStatus, 
  clearLicenseRegisteredDevices, 
  deleteLicenseFromCloud,
  getOrCreateDeviceId,
  regenerateDeviceId,
  removeDeviceFromLicense
} from '../lib/syncService';
import ConfirmModal from './ConfirmModal';
import ResetFactoryModal from './ResetFactoryModal';
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
  | 'licencia'
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
  onClearAllInvoices?: () => void | Promise<void>;
  onResetApp?: () => void | Promise<void>;
  licenseData?: AppLicense | null;
  onDeactivateLicense?: () => void;
  onOpenBackupModal?: () => void;
  onOpenExportModal?: () => void;
}

export default function Ajustes({
  settings,
  onUpdateSettings,
  users = [],
  currentUser,
  onSaveUser,
  onDeleteUser,
  onClearAllInvoices,
  onResetApp,
  licenseData,
  onDeactivateLicense,
  onOpenBackupModal,
  onOpenExportModal
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

  // License Security (Developer / Creator Access Only)
  const [isLicenseUnlocked, setIsLicenseUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('remix_license_unlocked') === 'true';
  });
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [devPasswordError, setDevPasswordError] = useState<string | null>(null);
  const [showDevPassword, setShowDevPassword] = useState(false);
  const [showChangeDevKeyModal, setShowChangeDevKeyModal] = useState(false);
  const [newDevKeyInput, setNewDevKeyInput] = useState('');
  const [changeKeyMsg, setChangeKeyMsg] = useState<string | null>(null);

  // Get current developer master password (default: 'admin2026')
  const getDevMasterPassword = (): string => {
    return localStorage.getItem('remix_dev_master_password') || 'admin2026';
  };

  const handleUnlockLicense = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPass = devPasswordInput.trim();
    const master = getDevMasterPassword();
    if (cleanPass === master) {
      setIsLicenseUnlocked(true);
      sessionStorage.setItem('remix_license_unlocked', 'true');
      setDevPasswordError(null);
      setDevPasswordInput('');
    } else {
      setDevPasswordError('Contraseña incorrecta. Solo el creador de la App puede acceder.');
    }
  };

  const handleLockLicense = () => {
    setIsLicenseUnlocked(false);
    sessionStorage.removeItem('remix_license_unlocked');
    setDevPasswordInput('');
    setDevPasswordError(null);
  };

  const handleChangeDevMasterPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDevKeyInput.trim().length < 4) {
      setChangeKeyMsg('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }
    localStorage.setItem('remix_dev_master_password', newDevKeyInput.trim());
    setChangeKeyMsg('¡Contraseña de creador actualizada correctamente!');
    setTimeout(() => {
      setShowChangeDevKeyModal(false);
      setNewDevKeyInput('');
      setChangeKeyMsg(null);
    }, 1500);
  };

  // License Management & Generator State
  const [allLicenses, setAllLicenses] = useState<AppLicense[]>([]);
  const [licenseSearchQuery, setLicenseSearchQuery] = useState('');
  const [licenseSubTab, setLicenseSubTab] = useState<'clientes' | 'este_equipo'>('clientes');
  const [showCreateLicenseModal, setShowCreateLicenseModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newGeneratedKey, setNewGeneratedKey] = useState('');
  const [newMaxDevices, setNewMaxDevices] = useState<number>(5);
  const [newExpiresType, setNewExpiresType] = useState<'permanente' | 'fecha'>('permanente');
  const [newExpiresDate, setNewExpiresDate] = useState('');
  const [newLicenseNotes, setNewLicenseNotes] = useState('');
  const [isSavingLicense, setIsSavingLicense] = useState(false);
  const [licenseFormError, setLicenseFormError] = useState<string | null>(null);
  const [createdSuccessLicense, setCreatedSuccessLicense] = useState<AppLicense | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Helper to generate a clean formatted license key
  const generateNewLicenseKey = (): string => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 4; i++) {
      p1 += chars.charAt(Math.floor(Math.random() * chars.length));
      p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `REMIX-2026-${p1}-${p2}`;
  };

  // Open creation modal with fresh key
  const handleOpenCreateLicense = () => {
    setNewClientName('');
    setNewGeneratedKey(generateNewLicenseKey());
    setNewMaxDevices(5);
    setNewExpiresType('permanente');
    setNewExpiresDate('');
    setNewLicenseNotes('');
    setLicenseFormError(null);
    setShowCreateLicenseModal(true);
  };

  // Subscribe to all licenses in Firebase when unlocked
  useEffect(() => {
    if (!isLicenseUnlocked) return;
    const unsub = subscribeAllLicenses((list) => {
      setAllLicenses(list);
    });
    return () => unsub();
  }, [isLicenseUnlocked]);

  // Copy to clipboard helper
  const handleCopyKey = (key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(key);
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  // WhatsApp share helper
  const handleShareLicenseWhatsapp = (lic: AppLicense) => {
    const maxDevsText = lic.maxDevices ? `${lic.maxDevices} equipos` : 'Dispositivos Ilimitados';
    const vencText = lic.expiresAt && lic.expiresAt !== 'permanente' ? lic.expiresAt : 'Permanente / De por vida';
    const message = `*CONTROL DE PAGOS - REMIX*\n\n¡Hola! Te compartimos la clave de activación de tu software:\n\n*Cliente:* ${lic.assignedTo}\n*Clave de Licencia:* ${lic.key}\n*Límite:* ${maxDevsText}\n*Vigencia:* ${vencText}\n\nIngresa esta clave en tu pantalla de activación para iniciar el uso del sistema.`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Submit new license
  const handleSubmitNewLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      setLicenseFormError('Por favor ingrese el nombre del cliente o empresa.');
      return;
    }
    if (!newGeneratedKey.trim()) {
      setLicenseFormError('Por favor genere o ingrese una clave de licencia.');
      return;
    }
    if (newExpiresType === 'fecha' && !newExpiresDate) {
      setLicenseFormError('Seleccione la fecha de vencimiento.');
      return;
    }

    setIsSavingLicense(true);
    setLicenseFormError(null);

    const licenseToSave: AppLicense = {
      key: newGeneratedKey.trim().toUpperCase(),
      assignedTo: newClientName.trim(),
      active: true,
      maxDevices: Number(newMaxDevices) || 5,
      activatedDevices: [],
      createdAt: new Date().toISOString().split('T')[0],
      expiresAt: newExpiresType === 'permanente' ? 'permanente' : newExpiresDate,
      notes: newLicenseNotes.trim() || undefined
    };

    const success = await saveLicenseToCloud(licenseToSave);
    setIsSavingLicense(false);

    if (success) {
      setShowCreateLicenseModal(false);
      setCreatedSuccessLicense(licenseToSave);
    } else {
      setLicenseFormError('Ocurrió un error al guardar la licencia en Firebase. Verifique la conexión.');
    }
  };

  // Toggle active/inactive
  const handleToggleLicenseActive = async (lic: AppLicense) => {
    const newStatus = !lic.active;
    const confirmMsg = newStatus 
      ? `¿Reactivar la licencia para "${lic.assignedTo}"? Los dispositivos podrán volver a acceder.`
      : `¿Suspender la licencia de "${lic.assignedTo}"? El sistema se bloqueará en sus dispositivos.`;
    if (window.confirm(confirmMsg)) {
      await toggleLicenseActiveStatus(lic.key, newStatus);
    }
  };

  // Reset devices
  const handleResetLicenseDevices = async (lic: AppLicense) => {
    if (window.confirm(`¿Liberar los equipos de "${lic.assignedTo}"? Se borrarán los ${lic.activatedDevices?.length || 0} dispositivos registrados para que el cliente pueda registrar equipos nuevos.`)) {
      await clearLicenseRegisteredDevices(lic.key);
    }
  };

  // Delete license
  const handleDeleteLicense = async (lic: AppLicense) => {
    if (window.confirm(`¿ELIMINAR DEFINITIVAMENTE la licencia de "${lic.assignedTo}"? Esta acción no se puede deshacer.`)) {
      await deleteLicenseFromCloud(lic.key);
    }
  };

  const [thisDeviceId, setThisDeviceId] = useState<string>(() => getOrCreateDeviceId());

  const handleRegenerateDeviceId = () => {
    if (window.confirm('¿Desea generar un nuevo ID para este dispositivo? Utilícelo si dos equipos tienen el mismo identificador o fueron sincronizados/clonados desde la misma cuenta.')) {
      const newId = regenerateDeviceId();
      setThisDeviceId(newId);
      setNotification({
        type: 'success',
        message: `Nuevo ID asignado a este equipo: ${newId}. Valide la clave nuevamente para registrarlo en la nube.`
      });
    }
  };

  const handleRemoveSingleDevice = async (lic: AppLicense, devId: string) => {
    if (window.confirm(`¿Desea desvincular el dispositivo "${devId}" de la licencia "${lic.assignedTo}"?`)) {
      await removeDeviceFromLicense(lic.key, devId);
      setNotification({
        type: 'success',
        message: `Dispositivo "${devId}" liberado del cupo de "${lic.assignedTo}".`
      });
    }
  };

  const filteredLicenses = useMemo(() => {
    if (!licenseSearchQuery.trim()) return allLicenses;
    const q = licenseSearchQuery.toLowerCase();
    return allLicenses.filter(lic => 
      lic.assignedTo.toLowerCase().includes(q) || 
      lic.key.toLowerCase().includes(q) ||
      (lic.notes && lic.notes.toLowerCase().includes(q))
    );
  }, [allLicenses, licenseSearchQuery]);

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
          'registrar-remision': true,
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
    },
    {
      id: 'licencia',
      label: 'Licencia del Software',
      shortDesc: 'Información y estado de la activación',
      icon: Key,
      badgeText: isLicenseUnlocked ? 'Desbloqueado' : 'Protegido',
      keywords: ['licencia', 'clave', 'activacion', 'software', 'equipo', 'dispositivo', 'empresa', 'proteccion', 'desarrollador', 'creador']
    }
  ], [darkMode, passwordEnabled, storedBiometric, users.length, licenseData, isLicenseUnlocked]);

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
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
            <nav className="p-2 space-y-1">
              {filteredSections.map((sec) => {
                const Icon = sec.icon;
                const isSelected = activeSection === sec.id;

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSection(sec.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group border ${
                      isSelected
                        ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/40 dark:border-amber-500/40 text-amber-950 dark:text-amber-200 shadow-xs'
                        : 'bg-transparent border-transparent hover:bg-slate-100/80 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:text-amber-500 dark:group-hover:text-amber-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <span className={`text-xs font-bold truncate ${
                        isSelected ? 'text-amber-900 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {sec.label}
                      </span>
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected
                        ? 'text-amber-600 dark:text-amber-400 translate-x-0.5'
                        : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-500'
                    }`} />
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

        </aside>

        {/* ========================================================================= */}
        {/* COLUMNA SIGUIENTE: Contenido del Ajuste Seleccionado (Scroll Independiente) */}
        {/* ========================================================================= */}
        <main className="flex-1 min-w-0 w-full lg:h-full lg:overflow-y-auto space-y-6 pr-1 lg:pr-3 pb-12 scrollbar-thin">
          
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
                {/* Backup and Cloud Resguardo Card */}
                <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-600/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Copias de Seguridad y Resúmenes en Google Drive
                      </h4>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full">
                        Nube Segura
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                      Guarde y restaure copias de seguridad de sus facturas, cobranzas y clientes directamente en su cuenta de Google Drive o descargue archivos JSON para pendrives. También puede exportar planillas de facturación directamente a su Drive.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    {onOpenExportModal && (
                      <button
                        type="button"
                        onClick={onOpenExportModal}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                        Exportar a Drive
                      </button>
                    )}
                    {onOpenBackupModal && (
                      <button
                        type="button"
                        onClick={onOpenBackupModal}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                      >
                        <CloudUpload className="w-4 h-4" />
                        Centro de Copias
                      </button>
                    )}
                  </div>
                </div>

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
                        Elimina todas las facturas y cobros de la base de datos (tanto localmente como en la nube). Los clientes guardados permanecerán intactos para facilitar la autocompletación.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmClearInvoices(true)}
                      className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar Todas las Facturas
                    </button>
                  </div>

                  {/* Restablecer app */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Restablecer Todo de Fábrica
                      </h4>
                      <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                        Elimina por completo todas las facturas y todos los clientes guardados (local y en la nube). Restablece la contraseña del administrador a <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">admin</code>. Requiere contraseña de Administrador.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmResetApp(true)}
                      className="w-full py-2.5 px-3 bg-slate-700 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restablecer Todo de Fábrica
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECCIÓN: LICENCIA DEL SOFTWARE (PROTEGIDA POR CONTRASEÑA) */}
          {/* ========================================================= */}
          {(activeSection === 'licencia' || activeSection === 'todos') && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span>Licencia del Software y Activación</span>
                      {!isLicenseUnlocked && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-semibold border border-amber-300 dark:border-amber-800">
                          <Lock className="w-3 h-3" />
                          Acceso Restringido al Desarrollador
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Gestión de clave de licencia, cupo de equipos y seguridad del software
                    </p>
                  </div>
                </div>

                {isLicenseUnlocked ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowChangeDevKeyModal(true)}
                      className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    >
                      Cambiar Contraseña Creador
                    </button>
                    <button
                      type="button"
                      onClick={handleLockLicense}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer shadow-xs transition-colors"
                      title="Volver a bloquear esta sección"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Bloquear
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    <Lock className="w-3 h-3 text-amber-500" />
                    Protegido
                  </span>
                )}
              </div>

              {!isLicenseUnlocked ? (
                /* PANTALLA DE BLOQUEO CON CONTRASEÑA DE CREADOR */
                <div className="p-6 sm:p-8 text-center max-w-md mx-auto space-y-4">
                  <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 rounded-2xl flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 shadow-inner">
                    <Lock className="w-7 h-7" />
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Área Exclusiva del Desarrollador
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Esta sección contiene información confidencial de la licencia y desvinculación de equipos. Ingrese la contraseña de creador para desbloquear.
                    </p>
                  </div>

                  <form onSubmit={handleUnlockLicense} className="space-y-3 pt-2 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Contraseña de Creador / Programador
                      </label>
                      <div className="relative">
                        <input
                          id="dev-password-input"
                          type={showDevPassword ? 'text' : 'password'}
                          value={devPasswordInput}
                          onChange={(e) => {
                            setDevPasswordInput(e.target.value);
                            if (devPasswordError) setDevPasswordError(null);
                          }}
                          placeholder="Ingrese contraseña de desarrollador"
                          className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 dark:focus:border-amber-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDevPassword(!showDevPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showDevPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {devPasswordError && (
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{devPasswordError}</span>
                      </div>
                    )}

                    <button
                      id="btn-unlock-license-section"
                      type="submit"
                      className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Desbloquear Licencia
                    </button>
                  </form>
                </div>
              ) : (
                /* CONTENIDO COMPLETO DE LICENCIA (DESBLOQUEADO PARA DESARROLLADOR) */
                <div className="p-5 space-y-5">
                  {/* Banner de estado seguro y botón de acción principal */}
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-xl flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex-wrap">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Panel Maestro de Licencias - Desarrollador</span>
                    </div>
                    <button
                      type="button"
                      id="btn-create-new-license"
                      onClick={handleOpenCreateLicense}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-transform active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      Crear Nueva Licencia
                    </button>
                  </div>

                  {/* Sub-pestañas: Licencias de Clientes vs Este Equipo */}
                  <div className="flex border-b border-slate-200 dark:border-slate-700 gap-4 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setLicenseSubTab('clientes')}
                      className={`pb-2.5 px-1 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
                        licenseSubTab === 'clientes'
                          ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Licencias para Clientes</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                        {allLicenses.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLicenseSubTab('este_equipo')}
                      className={`pb-2.5 px-1 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
                        licenseSubTab === 'este_equipo'
                          ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      <Laptop className="w-4 h-4" />
                      <span>Licencia de este Equipo Actual</span>
                    </button>
                  </div>

                  {licenseSubTab === 'clientes' ? (
                    /* VISTA DE TODAS LAS LICENCIAS / GESTOR */
                    <div className="space-y-4">
                      {/* Barra de diagnóstico del equipo actual */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Laptop className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 dark:text-slate-200">ID de este equipo:</span>
                              <code className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                {thisDeviceId}
                              </code>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Cada computadora o celular debe registrar su propio ID con la misma clave para sumar al cupo.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRegenerateDeviceId}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                          title="Si copiaste o sincronizaste el navegador entre 2 equipos, regenera el ID para que no compartan el mismo número"
                        >
                          <RefreshCw className="w-3 h-3 text-slate-400" />
                          Regenerar ID de este equipo
                        </button>
                      </div>

                      {/* Barra de búsqueda y conteos */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:w-72">
                          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            value={licenseSearchQuery}
                            onChange={(e) => setLicenseSearchQuery(e.target.value)}
                            placeholder="Buscar cliente, clave o nota..."
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs text-slate-500">
                          <span>
                            Total: <strong className="text-slate-800 dark:text-slate-100">{allLicenses.length}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Activas: <strong className="text-emerald-600 dark:text-emerald-400">{allLicenses.filter(l => l.active).length}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Lista de tarjetas de licencias */}
                      {filteredLicenses.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                          <Key className="w-10 h-10 text-slate-400 mx-auto" />
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {licenseSearchQuery ? 'No se encontraron licencias con esa búsqueda' : 'No hay licencias registradas aún'}
                          </div>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Crea una licencia para tu próximo cliente para darle acceso a la App con clave y control de cupo.
                          </p>
                          <button
                            type="button"
                            onClick={handleOpenCreateLicense}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                          >
                            <Plus className="w-4 h-4" />
                            Crear Primera Licencia
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3.5">
                          {filteredLicenses.map((lic) => {
                            const isExpired = lic.expiresAt && lic.expiresAt !== 'permanente' && lic.expiresAt < new Date().toISOString().split('T')[0];
                            const deviceCount = lic.activatedDevices?.length || 0;
                            const maxCount = lic.maxDevices || 15;

                            return (
                              <div
                                key={lic.key}
                                className={`p-4 rounded-xl border transition-all ${
                                  !lic.active || isExpired
                                    ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-90'
                                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 shadow-2xs'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                        {lic.assignedTo}
                                      </h4>
                                      {lic.active ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                                          <Check className="w-3 h-3" />
                                          Activa
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800">
                                          Suspendida
                                        </span>
                                      )}
                                      {isExpired && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                                          Expirada
                                        </span>
                                      )}
                                    </div>
                                    {lic.notes && (
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        {lic.notes}
                                      </p>
                                    )}
                                  </div>

                                  {/* Clave con botón de copiar */}
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-900 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                      {lic.key}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyKey(lic.key)}
                                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                                      title="Copiar Clave"
                                    >
                                      {copiedKey === lic.key ? (
                                        <CheckCheck className="w-4 h-4 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 text-xs">
                                  <div>
                                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Equipos autorizados:</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                                      <Laptop className="w-3.5 h-3.5 text-slate-400" />
                                      {deviceCount} de {maxCount} equipos en uso
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Vencimiento:</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      {lic.expiresAt && lic.expiresAt !== 'permanente' ? lic.expiresAt : 'Permanente'}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Emitida:</span>
                                    <span className="text-slate-600 dark:text-slate-400 block mt-0.5">
                                      {lic.createdAt || '2026'}
                                    </span>
                                  </div>
                                </div>

                                {/* Lista detallada de equipos autorizados / registrados */}
                                {lic.activatedDevices && lic.activatedDevices.length > 0 ? (
                                  <div className="py-2.5 px-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 mb-3">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                      <span className="flex items-center gap-1.5">
                                        <Laptop className="w-3.5 h-3.5 text-amber-500" />
                                        Equipos Registrados ({lic.activatedDevices.length} de {maxCount}):
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-normal">
                                        Este equipo: <strong className="font-mono text-amber-600 dark:text-amber-400 font-bold">{thisDeviceId}</strong>
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                      {lic.activatedDevices.map((devId, idx) => {
                                        const isCurrent = devId === thisDeviceId;
                                        const isMobile = devId.startsWith('MOB');
                                        return (
                                          <span
                                            key={idx}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                                              isCurrent
                                                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold shadow-2xs'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                            }`}
                                          >
                                            {isMobile ? (
                                              <Smartphone className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                            ) : (
                                              <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            )}
                                            <span>{devId}</span>
                                            {isCurrent ? (
                                              <span className="text-[9px] font-sans font-bold bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-md">
                                                Esta PC
                                              </span>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveSingleDevice(lic, devId)}
                                                className="ml-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded cursor-pointer"
                                                title={`Desvincular equipo ${devId}`}
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            )}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="py-2 px-3 bg-amber-50/50 dark:bg-amber-950/20 border border-dashed border-amber-200 dark:border-amber-800/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 mb-3">
                                    No hay dispositivos registrados en la nube todavía. Al activar la clave en una PC o celular con internet, aparecerá aquí.
                                  </div>
                                )}

                                {/* Acciones de la licencia */}
                                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleShareLicenseWhatsapp(lic)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                                      title="Enviar clave y datos al cliente por WhatsApp"
                                    >
                                      <Share2 className="w-3.5 h-3.5" />
                                      Enviar por WhatsApp
                                    </button>

                                    {deviceCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleResetLicenseDevices(lic)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                        title="Borra la lista de dispositivos para que el cliente pueda registrarlos de nuevo"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                                        Liberar Cupo ({deviceCount})
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleLicenseActive(lic)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                        lic.active
                                          ? 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                          : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                      }`}
                                    >
                                      {lic.active ? 'Suspender' : 'Reactivar'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLicense(lic)}
                                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                                      title="Eliminar Licencia"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* VISTA DE ESTE EQUIPO ACTUAL */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                            Asignada a:
                          </span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {licenseData?.assignedTo || 'Cliente / Empresa Autorizada'}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                            Clave de Licencia:
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                            {licenseData?.key || 'REMIX-DEFAULT-LICENSE'}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                            Dispositivos Habilitados:
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {licenseData?.maxDevices 
                              ? `${licenseData.activatedDevices?.length || 1} de ${licenseData.maxDevices} equipos registrados`
                              : 'Dispositivos Ilimitados'}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                            Vencimiento:
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {licenseData?.expiresAt && licenseData.expiresAt !== 'permanente' 
                              ? licenseData.expiresAt 
                              : 'Permanente / De por vida'}
                          </span>
                        </div>
                      </div>

                      {licenseData?.activatedDevices && licenseData.activatedDevices.length > 0 && (
                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                            Equipos Registrados para esta Licencia:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {licenseData.activatedDevices.map((devId, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-medium text-slate-700 dark:text-slate-300 shadow-2xs"
                              >
                                <Laptop className="w-3.5 h-3.5 text-slate-400" />
                                {devId}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {onDeactivateLicense && (
                        <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('¿Desea desvincular la licencia de este equipo? El sistema volverá a solicitar la clave para permitir el uso.')) {
                                onDeactivateLicense();
                              }
                            }}
                            className="px-3 py-1.5 border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Desvincular Licencia de este Equipo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Modal para cambiar la contraseña de creador */}
          {showChangeDevKeyModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-500" />
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Nueva Contraseña de Creador
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangeDevKeyModal(false);
                      setNewDevKeyInput('');
                      setChangeKeyMsg(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleChangeDevMasterPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Nueva Clave Maestra (mínimo 4 caracteres)
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={newDevKeyInput}
                      onChange={(e) => setNewDevKeyInput(e.target.value)}
                      placeholder="Ej: miClaveSecreta#99"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {changeKeyMsg && (
                    <div className="p-2 text-xs rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      {changeKeyMsg}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowChangeDevKeyModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg cursor-pointer shadow-xs"
                    >
                      Guardar Clave
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal para Crear Nueva Licencia */}
          {showCreateLicenseModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        Crear Nueva Licencia de Cliente
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Emisión para computadoras y móviles con clave única
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateLicenseModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmitNewLicense} className="space-y-4">
                  {/* Nombre del Cliente */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nombre del Cliente o Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Ej: Distribuidora González, Farmacia Central, etc."
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Clave de Licencia */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Clave de Licencia Generada *
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewGeneratedKey(generateNewLicenseKey())}
                        className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Generar otra clave
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={newGeneratedKey}
                        onChange={(e) => setNewGeneratedKey(e.target.value.toUpperCase())}
                        placeholder="REMIX-2026-XXXX-YYYY"
                        className="w-full px-3.5 py-2.5 font-mono font-bold text-amber-600 dark:text-amber-400 text-sm bg-amber-50/50 dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-xl focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Límite de Equipos */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Límite de Dispositivos / Equipos Autorizados
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 3, 5, 10, 15].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setNewMaxDevices(qty)}
                          className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            newMaxDevices === qty
                              ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {qty} {qty === 1 ? 'Equipo' : 'Equipos'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vencimiento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Vigencia o Vencimiento
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setNewExpiresType('permanente')}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                          newExpiresType === 'permanente'
                            ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        Permanente (De por vida)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewExpiresType('fecha')}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                          newExpiresType === 'fecha'
                            ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        Fecha de Vencimiento
                      </button>
                    </div>

                    {newExpiresType === 'fecha' && (
                      <input
                        type="date"
                        required
                        value={newExpiresDate}
                        onChange={(e) => setNewExpiresDate(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-none"
                      />
                    )}
                  </div>

                  {/* Notas internas */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Observaciones / Notas internas (opcional)
                    </label>
                    <input
                      type="text"
                      value={newLicenseNotes}
                      onChange={(e) => setNewLicenseNotes(e.target.value)}
                      placeholder="Ej: Pago al contado, sucursal Central, teléfono de contacto..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {licenseFormError && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{licenseFormError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setShowCreateLicenseModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingLicense}
                      className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl cursor-pointer shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isSavingLicense ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Guardando en Firebase...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Crear y Guardar en Firebase</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal de Éxito al Crear Licencia */}
          {createdSuccessLicense && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xl text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    ¡Licencia Generada con Éxito!
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Guardada en Firebase para <strong>{createdSuccessLicense.assignedTo}</strong>
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Clave para el Cliente:</span>
                    <span className="text-[11px] text-slate-500">
                      Cupo: {createdSuccessLicense.maxDevices} equipos
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-amber-300 dark:border-amber-800 text-center">
                    <span className="font-mono text-base font-black text-amber-600 dark:text-amber-400 tracking-wider">
                      {createdSuccessLicense.key}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleShareLicenseWhatsapp(createdSuccessLicense)}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Enviar Datos al Cliente por WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyKey(createdSuccessLicense.key)}
                    className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {copiedKey === createdSuccessLicense.key ? (
                      <>
                        <CheckCheck className="w-4 h-4 text-emerald-500" />
                        <span>¡Clave Copiada al Portapapeles!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Clave al Portapapeles</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreatedSuccessLicense(null)}
                    className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  >
                    Listo, cerrar
                  </button>
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
        onConfirm={async () => {
          if (onClearAllInvoices) {
            await onClearAllInvoices();
            setNotification({ type: 'success', message: 'Se han eliminado todas las facturas con éxito (local y en la nube).' });
            setTimeout(() => setNotification(null), 4000);
          }
        }}
        onClose={() => setConfirmClearInvoices(false)}
      />

      {/* High Security Modal: Reset All to Factory (Requires Admin Password) */}
      <ResetFactoryModal
        isOpen={confirmResetApp}
        onClose={() => setConfirmResetApp(false)}
        currentUser={currentUser}
        users={users}
        settings={settings}
        onConfirmReset={async () => {
          if (onResetApp) {
            await onResetApp();
            setNotification({ 
              type: 'success', 
              message: 'La aplicación ha sido restablecida a su estado original de fábrica (facturas y clientes eliminados).' 
            });
            setTimeout(() => {
              setNotification(null);
              window.location.reload();
            }, 1200);
          }
        }}
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
