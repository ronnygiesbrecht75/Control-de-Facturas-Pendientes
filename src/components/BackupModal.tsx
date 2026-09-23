/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  X, 
  Download, 
  FolderOpen, 
  Cloud, 
  CloudUpload, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  HardDrive,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  LogOut
} from 'lucide-react';
import { Invoice, Client, UserSettings } from '../types';
import { exportBackup, createBackupPayload } from '../utils/exportHelpers';
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  getAccessToken,
  uploadBackupToGoogleDrive, 
  listGoogleDriveBackups, 
  downloadBackupContentFromDrive, 
  deleteBackupFromDrive,
  DriveBackupFile 
} from '../lib/googleDriveService';
import ConfirmModal from './ConfirmModal';
import { User } from 'firebase/auth';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  clients: Client[];
  settings: UserSettings;
  systemDate: string;
  onRestoreBackup: (payload: { invoices: Invoice[]; settings?: any; clients?: Client[] }) => void;
}

export default function BackupModal({
  isOpen,
  onClose,
  invoices,
  clients,
  settings,
  systemDate,
  onRestoreBackup
}: BackupModalProps) {
  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth & Token States
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Cloud backup states
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState<boolean>(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  // Confirmation Modal state for destructive operations (MANDATORY per skill)
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    confirmText: string;
    action: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    confirmText: 'Confirmar',
    action: () => {}
  });

  // Check auth state on mount
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setHasToken(!!token);
        fetchDriveBackups();
      },
      () => {
        setGoogleUser(null);
        setHasToken(false);
        setDriveBackups([]);
      }
    );

    // Initial token check in case already cached
    getAccessToken().then(token => {
      if (token) {
        setHasToken(true);
        fetchDriveBackups();
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isOpen]);

  const showToast = (type: 'success' | 'error' | 'info', msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => {
      setNotice(prev => (prev?.msg === msg ? null : prev));
    }, 4500);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setHasToken(true);
        showToast('success', `¡Conectado exitosamente como ${result.user.email}!`);
        await fetchDriveBackups();
      } else {
        // User closed or dismissed the popup window
        showToast('info', 'Inicio de sesión cancelado o ventana cerrada.');
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        showToast('info', 'Inicio de sesión cancelado o ventana cerrada.');
      } else {
        console.warn('Google Sign-In non-fatal error:', err);
        showToast('error', err?.message || 'Error al conectar con la cuenta de Google.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setHasToken(false);
      setDriveBackups([]);
      showToast('success', 'Sesión de Google cerrada.');
    } catch (err: any) {
      showToast('error', 'Error al desconectar la cuenta.');
    }
  };

  const fetchDriveBackups = async () => {
    setIsLoadingDrive(true);
    try {
      const list = await listGoogleDriveBackups();
      setDriveBackups(list);
    } catch (err: any) {
      console.error('Error listing Drive backups:', err);
      // Don't show toast if simply not signed in yet
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleUploadBackupToDrive = async () => {
    setIsUploadingDrive(true);
    try {
      const payload = createBackupPayload(invoices, settings, clients, systemDate);
      const uploaded = await uploadBackupToGoogleDrive(payload);
      showToast('success', `¡Copia guardada con éxito en Google Drive (${uploaded.name})!`);
      await fetchDriveBackups();
    } catch (err: any) {
      console.error('Error uploading to Drive:', err);
      showToast('error', err?.message || 'Error al subir la copia a Google Drive.');
    } finally {
      setIsUploadingDrive(false);
    }
  };

  // User Confirmation prior to restoring from Drive (Destructive: overwrites local data)
  const promptRestoreFromDrive = (file: DriveBackupFile) => {
    setConfirmConfig({
      isOpen: true,
      title: '¿Restaurar copia de seguridad desde Google Drive?',
      message: `Se cargarán los datos de "${file.name}" creados el ${new Date(file.createdTime).toLocaleString()}. Los datos actuales que no hayan sido respaldados serán reemplazados por los de esta copia. ¿Desea continuar?`,
      variant: 'warning',
      confirmText: 'Sí, Restaurar Datos',
      action: async () => {
        try {
          const payload = await downloadBackupContentFromDrive(file.id);
          if (payload && Array.isArray(payload.invoices)) {
            onRestoreBackup(payload);
            showToast('success', '¡Copia de seguridad restaurada correctamente desde Google Drive!');
          } else {
            showToast('error', 'El archivo no contiene un formato de respaldo válido.');
          }
        } catch (e: any) {
          showToast('error', e?.message || 'Error al descargar la copia desde Google Drive.');
        }
      }
    });
  };

  // User Confirmation prior to deleting from Drive (Destructive: deletes file from Drive)
  const promptDeleteFromDrive = (file: DriveBackupFile) => {
    setConfirmConfig({
      isOpen: true,
      title: '¿Eliminar copia de Google Drive?',
      message: `Está a punto de eliminar permanentemente la copia "${file.name}" de su cuenta de Google Drive. Esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Eliminar de Drive',
      action: async () => {
        try {
          await deleteBackupFromDrive(file.id);
          setDriveBackups(prev => prev.filter(b => b.id !== file.id));
          showToast('success', 'Copia eliminada de Google Drive.');
        } catch (e: any) {
          showToast('error', e?.message || 'Error al eliminar el archivo.');
        }
      }
    });
  };

  // Local Import logic
  const handleImportLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string);
        if (payload && Array.isArray(payload.invoices)) {
          setConfirmConfig({
            isOpen: true,
            title: '¿Restaurar copia de archivo local?',
            message: `Se encontraron ${payload.invoices.length} facturas en "${file.name}". Esta acción reemplazará los datos actuales por los del archivo.`,
            variant: 'warning',
            confirmText: 'Restaurar Ahora',
            action: () => {
              onRestoreBackup(payload);
              showToast('success', '¡Copia de seguridad local restaurada exitosamente!');
            }
          });
        } else {
          showToast('error', 'Formato de archivo inválido. Revise su respaldo.');
        }
      } catch (err) {
        showToast('error', 'Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base font-display">Copias de Seguridad y Resguardo</h3>
                <p className="text-xs text-slate-500">Google Drive en la nube y archivos locales</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2 bg-slate-50/30 dark:bg-slate-950/20">
            <button
              onClick={() => setActiveTab('cloud')}
              className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'cloud'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Cloud className="w-4 h-4" />
              Google Drive (Nube)
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold">
                Recomendado
              </span>
            </button>
            <button
              onClick={() => setActiveTab('local')}
              className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'local'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              Archivo Local (.json)
            </button>
          </div>

          {/* Main Content Area */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Global Notice Toast */}
            {notice && (
              <div className={`p-3 text-xs rounded-xl border flex items-center gap-2.5 animate-fade-in ${
                notice.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : notice.type === 'info'
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
              }`}>
                {notice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className={`w-4 h-4 flex-shrink-0 ${
                    notice.type === 'info' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                  }`} />
                )}
                <span className="font-medium">{notice.msg}</span>
              </div>
            )}

            {/* TAB 1: GOOGLE DRIVE CLOUD */}
            {activeTab === 'cloud' && (
              <div className="space-y-4">
                {/* Google Connection Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/60 dark:border-amber-600/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {googleUser?.photoURL ? (
                        <img 
                          src={googleUser.photoURL} 
                          alt="Foto de perfil de Google" 
                          className="w-10 h-10 rounded-full border border-amber-400 object-cover" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm">
                          {googleUser?.email ? googleUser.email.charAt(0).toUpperCase() : <Cloud className="w-5 h-5" />}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {googleUser?.displayName || 'Cuenta de Google'}
                          </span>
                          {hasToken && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              Conectado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                          {googleUser?.email || 'Conecta tu cuenta para respaldar en Google Drive'}
                        </p>
                      </div>
                    </div>

                    <div>
                      {hasToken && googleUser ? (
                        <button
                          onClick={handleGoogleLogout}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-rose-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Desconectar
                        </button>
                      ) : (
                        /* Official Sign-In With Google Button Specification */
                        <button
                          onClick={handleGoogleLogin}
                          disabled={isLoggingIn}
                          className="gsi-material-button inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '100%', height: '100%' }}>
                              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                              <path fill="none" d="M0 0h48v48H0z"></path>
                            </svg>
                          </div>
                          <span>{isLoggingIn ? 'Conectando...' : 'Conectar con Google'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Feature description / assurances */}
                  <div className="mt-3 pt-3 border-t border-amber-200/50 dark:border-amber-800/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span><strong>No borra ningún dispositivo</strong>: Almacena copias de seguridad fechadas en una carpeta propia de tu Google Drive.</span>
                    </p>
                  </div>
                </div>

                {/* Cloud Actions */}
                {hasToken ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={handleUploadBackupToDrive}
                        disabled={isUploadingDrive}
                        className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                      >
                        {isUploadingDrive ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Guardando en Google Drive...</span>
                          </>
                        ) : (
                          <>
                            <CloudUpload className="w-4 h-4" />
                            <span>Guardar Nueva Copia en Google Drive</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={fetchDriveBackups}
                        disabled={isLoadingDrive}
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                        title="Actualizar lista de respaldos"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {/* Backups List from Google Drive */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-500" />
                          Copias guardadas en Google Drive ({driveBackups.length})
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Carpeta: "Control de Pagos - Copias de Seguridad"
                        </span>
                      </div>

                      {isLoadingDrive ? (
                        <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                          <p>Consultando copias en Google Drive...</p>
                        </div>
                      ) : driveBackups.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-1.5">
                          <Cloud className="w-8 h-8 mx-auto text-slate-400" />
                          <p className="font-semibold text-slate-700 dark:text-slate-300">Aún no hay copias de seguridad en Google Drive</p>
                          <p className="text-[11px]">Pulsa "Guardar Nueva Copia" para resguardar todos tus datos ahora.</p>
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                          {driveBackups.map(file => {
                            const date = new Date(file.createdTime);
                            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div 
                                key={file.id} 
                                className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {file.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-amber-500" />
                                      {formattedDate}
                                    </span>
                                    {file.size && (
                                      <span>• {(parseInt(file.size, 10) / 1024).toFixed(1)} KB</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    onClick={() => promptRestoreFromDrive(file)}
                                    className="px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                    title="Restaurar datos desde esta copia"
                                  >
                                    <Download className="w-3 h-3" />
                                    Restaurar
                                  </button>
                                  <button
                                    onClick={() => promptDeleteFromDrive(file)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                    title="Eliminar de Google Drive"
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
                ) : (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-3">
                    <Cloud className="w-10 h-10 text-amber-500 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        Guarda tus copias de seguridad de forma automática y segura
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Al conectar tu cuenta de Google, tus facturas, cobros y clientes se guardarán en una carpeta protegida en Google Drive.
                      </p>
                    </div>
                    <button
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                    >
                      <Cloud className="w-4 h-4" />
                      <span>{isLoggingIn ? 'Conectando...' : 'Iniciar Sesión con Google'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ARCHIVO LOCAL (.JSON) */}
            {activeTab === 'local' && (
              <div className="space-y-4">
                {/* Action 1: Export Local File */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Download className="w-4 h-4 text-amber-500" />
                    <h4>1. Descargar copia de seguridad en este dispositivo</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Descarga un archivo <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[10px]">.json</code> con todas las facturas, clientes, usuarios y configuraciones para guardarlo en una memoria USB o disco local.
                  </p>
                  <button
                    id="backup-download-btn"
                    onClick={() => {
                      exportBackup(invoices, settings, clients);
                      showToast('success', '¡Archivo de respaldo descargado en tu equipo!');
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Respaldo Local (.json)
                  </button>
                </div>

                {/* Action 2: Import Local File */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <FolderOpen className="w-4 h-4 text-amber-500" />
                    <h4>2. Restaurar copia desde archivo local</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Selecciona un archivo <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[10px]">.json</code> previamente guardado para restaurar los datos en el sistema.
                  </p>

                  <input
                    id="backup-import-file-selector"
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleImportLocalFile}
                    className="hidden"
                  />

                  <button
                    id="backup-upload-trigger-btn"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-amber-500" />
                    Seleccionar Archivo JSON de Resguardo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Tus datos están protegidos y cifrados
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Destructive Operations (MANDATORY per skill) */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        confirmText={confirmConfig.confirmText}
        cancelText="Cancelar"
        onConfirm={confirmConfig.action}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
