/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Layers, 
  Calendar,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Invoice } from '../types';
import { exportInvoicesToCSV, generateInvoicesCSVContent } from '../utils/exportHelpers';
import { 
  initAuth, 
  googleSignIn, 
  uploadSummaryToGoogleDrive, 
  listGoogleDriveSummaries,
  getCurrentGoogleUser,
  DriveBackupFile 
} from '../lib/googleDriveService';
import { User } from 'firebase/auth';

interface ExportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  systemDate: string;
}

interface ReportOption {
  id: number;
  title: string;
  subtitle: string;
  filename: string;
  filter: (invoices: Invoice[]) => Invoice[];
  badgeColor: string;
}

export default function ExportSummaryModal({
  isOpen,
  onClose,
  invoices,
  systemDate
}: ExportSummaryModalProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'driveFiles'>('generate');
  const [googleUser, setGoogleUser] = useState<User | null>(getCurrentGoogleUser());
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [lastUploaded, setLastUploaded] = useState<{ id: number; file: DriveBackupFile } | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  // Drive summaries listing
  const [driveSummaries, setDriveSummaries] = useState<DriveBackupFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState<boolean>(false);

  const fetchDriveFiles = async () => {
    if (!hasToken) return;
    setIsLoadingDriveFiles(true);
    try {
      const list = await listGoogleDriveSummaries();
      setDriveSummaries(list);
    } catch (e: any) {
      console.warn('Error loading drive summaries:', e);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setHasToken(!!token);
      },
      () => {
        setGoogleUser(null);
        setHasToken(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && hasToken) {
      fetchDriveFiles();
    }
  }, [isOpen, hasToken]);

  const showToast = (type: 'success' | 'error' | 'info', msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => {
      setNotice(prev => (prev?.msg === msg ? null : prev));
    }, 4500);
  };

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setHasToken(true);
        showToast('success', `¡Conectado como ${result.user.email}!`);
      } else {
        showToast('info', 'Inicio de sesión cancelado o ventana cerrada.');
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        showToast('info', 'Inicio de sesión cancelado o ventana cerrada.');
      } else {
        showToast('error', err?.message || 'Error al conectar con Google.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const reports: ReportOption[] = [
    {
      id: 2,
      title: 'Reporte de Vencimientos (Pendientes)',
      subtitle: 'Facturas pendientes por cobrar (a vencer y vencidas)',
      filename: `Reporte_Vencimientos_Pendientes_${systemDate}.csv`,
      filter: (invs) => invs.filter(i => i.category === 'Facturas' && !i.paid),
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
    },
    {
      id: 3,
      title: 'Planilla General de Facturas',
      subtitle: 'Historial completo de Facturas de la categoría principal',
      filename: `Planilla_Facturas_Generales_${systemDate}.csv`,
      filter: (invs) => invs.filter(i => i.category === 'Facturas'),
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
    },
    {
      id: 4,
      title: 'Planilla de Otras Facturas',
      subtitle: 'Facturas clasificadas en la categoría secundaria "Otras"',
      filename: `Planilla_Otras_Facturas_${systemDate}.csv`,
      filter: (invs) => invs.filter(i => i.category === 'Otras'),
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
    },
    {
      id: 5,
      title: 'Planilla de Facturas de Cristian',
      subtitle: 'Facturas asignadas a la cartera de Cristian',
      filename: `Planilla_Facturas_Cristian_${systemDate}.csv`,
      filter: (invs) => invs.filter(i => i.category === 'Cristian'),
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
    },
    {
      id: 10,
      title: 'Base de Datos Completa (Todas juntas)',
      subtitle: 'Todas las facturas y remisiones de todos los clientes y categorías',
      filename: `Control_De_Pagos_Base_Completa_${systemDate}.csv`,
      filter: (invs) => invs,
      badgeColor: 'bg-slate-800 text-white dark:bg-slate-700 dark:text-amber-300'
    }
  ];

  // 1. Local download handler
  const handleDownloadLocal = (report: ReportOption) => {
    const list = report.filter(invoices);
    if (list.length === 0) {
      showToast('info', 'No hay registros en esta categoría para exportar.');
      return;
    }
    const cleanTitle = report.title.replace(/\s+/g, '_');
    exportInvoicesToCSV(list, cleanTitle, systemDate);
    showToast('success', `Archivo "${report.filename}" descargado en tu dispositivo.`);
  };

  // 2. Google Drive upload handler
  const handleUploadDrive = async (report: ReportOption) => {
    const list = report.filter(invoices);
    if (list.length === 0) {
      showToast('info', 'No hay registros en esta categoría para exportar.');
      return;
    }

    // Check if authenticated
    if (!googleUser || !hasToken) {
      setIsConnecting(true);
      try {
        const res = await googleSignIn();
        if (!res) {
          showToast('info', 'Debe conectar su cuenta de Google para exportar a Google Drive.');
          setIsConnecting(false);
          return;
        }
        setGoogleUser(res.user);
        setHasToken(true);
      } catch (e: any) {
        setIsConnecting(false);
        showToast('error', 'Error al conectar con Google.');
        return;
      }
      setIsConnecting(false);
    }

    setUploadingId(report.id);
    try {
      const csvContent = generateInvoicesCSVContent(list, systemDate);
      const uploaded = await uploadSummaryToGoogleDrive(
        csvContent,
        report.filename,
        `Resumen exportado el ${new Date().toLocaleString()} con ${list.length} registros.`
      );
      setLastUploaded({ id: report.id, file: uploaded });
      showToast('success', `¡Resumen "${report.filename}" guardado exitosamente en tu Google Drive!`);
      fetchDriveFiles();
    } catch (err: any) {
      showToast('error', err?.message || 'Error al guardar el resumen en Google Drive.');
    } finally {
      setUploadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-display">Exportar Resúmenes y Planillas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Integración directa con Google Drive y compatibilidad con Excel / Sheets
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Toast */}
        {notice && (
          <div className={`mt-4 p-3 text-xs rounded-xl border flex items-center gap-2.5 animate-fade-in flex-shrink-0 ${
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
            <span className="font-medium flex-1">{notice.msg}</span>
          </div>
        )}

        {/* Google Drive Account Banner */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <div className="text-xs font-semibold flex items-center gap-1.5">
                Google Drive
                {googleUser && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Conectado" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {googleUser 
                  ? `Conectado como: ${googleUser.email}`
                  : 'Conecta tu cuenta para guardar resúmenes en tu nube de Google'}
              </p>
            </div>
          </div>

          {!googleUser ? (
            <button
              onClick={handleConnectGoogle}
              disabled={isConnecting}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              {isConnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
              Conectar Google
            </button>
          ) : (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Sincronizado
            </span>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mt-4 flex-shrink-0">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'generate'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Generar Planillas</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('driveFiles');
              fetchDriveFiles();
            }}
            className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'driveFiles'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Planillas en Google Drive</span>
            {driveSummaries.length > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded-full">
                {driveSummaries.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: GENERATE PLANILLAS */}
        {activeTab === 'generate' && (
          <div className="mt-4 overflow-y-auto space-y-2.5 pr-1 flex-1">
            {reports.map((report) => {
              const list = report.filter(invoices);
              const count = list.length;
              const isUploadingThis = uploadingId === report.id;
              const hasUploadedThis = lastUploaded?.id === report.id;

              return (
                <div 
                  key={report.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400/50 dark:hover:border-amber-500/50 bg-white dark:bg-slate-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {report.title}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${report.badgeColor}`}>
                        {count} {count === 1 ? 'registro' : 'registros'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {report.subtitle}
                    </p>
                  </div>

                  {/* Dual Action Buttons: Local Download + Google Drive Upload */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDownloadLocal(report)}
                      disabled={count === 0}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        count === 0
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                      title="Descargar archivo .CSV en tu dispositivo"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                      <span>Descargar .CSV</span>
                    </button>

                    <button
                      onClick={() => handleUploadDrive(report)}
                      disabled={count === 0 || isUploadingThis}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        count === 0
                          ? 'opacity-40 cursor-not-allowed bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : hasUploadedThis
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs'
                      }`}
                      title="Guardar directamente en tu Google Drive"
                    >
                      {isUploadingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Subiendo...</span>
                        </>
                      ) : hasUploadedThis ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Guardado en Drive</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="w-3.5 h-3.5" />
                          <span>Google Drive</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: DRIVE FILES LIST */}
        {activeTab === 'driveFiles' && (
          <div className="mt-4 overflow-y-auto space-y-2.5 pr-1 flex-1">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Planillas guardadas en la carpeta de Google Drive:
              </span>
              <button
                onClick={fetchDriveFiles}
                disabled={isLoadingDriveFiles}
                className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>

            {isLoadingDriveFiles ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs">Consultando Google Drive...</span>
              </div>
            ) : driveSummaries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6">
                <Cloud className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold">No hay planillas exportadas aún en Google Drive</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ve a la pestaña "Generar Planillas" y presiona "Google Drive" en cualquier reporte.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {driveSummaries.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(file.createdTime).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          title="Abrir en Google Drive o Google Sheets"
                        >
                          <ExternalLink className="w-3 h-3 text-amber-500" />
                          <span>Abrir en Drive</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Las planillas se guardan en la carpeta "Control de Pagos - Copias de Seguridad" en tu Drive.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
