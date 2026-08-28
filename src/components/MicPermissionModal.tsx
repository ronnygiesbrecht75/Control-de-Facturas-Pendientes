/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  X,
  RefreshCw,
  Smartphone,
  Monitor,
  Apple,
  Sparkles,
  ShieldCheck,
  Volume2
} from 'lucide-react';
import {
  checkMicrophonePermission,
  requestMicrophoneAccess,
  isAppInIframe,
  MicPermissionStatus
} from '../utils/microphoneManager';

interface MicPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export default function MicPermissionModal({
  isOpen,
  onClose,
  onPermissionGranted
}: MicPermissionModalProps) {
  const [status, setStatus] = useState<MicPermissionStatus>('prompt');
  const [inIframe, setInIframe] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'chrome-pc' | 'android' | 'ios'>('chrome-pc');

  useEffect(() => {
    if (isOpen) {
      setInIframe(isAppInIframe());
      checkMicrophonePermission().then(setStatus);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestPermission = async () => {
    setIsTesting(true);
    setTestResult(null);

    const result = await requestMicrophoneAccess();
    setIsTesting(false);

    if (result.granted) {
      setStatus('granted');
      setTestResult({
        success: true,
        message: '¡Excelente! El micrófono está autorizado y funciona perfectamente.'
      });
      if (onPermissionGranted) {
        onPermissionGranted();
      }
    } else {
      setStatus('denied');
      setTestResult({
        success: false,
        message: result.errorMessage || 'No se pudo acceder al micrófono.'
      });
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-950/20 rounded-xl">
              <Mic className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-base font-black leading-tight">
                Permisos del Micrófono e IA
              </h2>
              <p className="text-xs font-medium text-slate-950/80">
                Solución para dictar cobros de facturas por voz
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-950/20 text-slate-950 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
          
          {/* Status Badge & Diagnosis */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Estado Actual del Micrófono:
              </span>
              {status === 'granted' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Autorizado
                </span>
              ) : status === 'denied' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  <MicOff className="w-3.5 h-3.5" />
                  Bloqueado o Denegado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Pendiente de Autorización
                </span>
              )}
            </div>

            {/* If inside iframe (AI Studio preview limitation) */}
            {inIframe && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 space-y-1.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[11px] leading-tight">
                      Estás en la ventana integrada (Vista previa AI Studio)
                    </p>
                    <p className="text-[11px] opacity-90">
                      Por seguridad, los navegadores suelen bloquear el micrófono dentro de ventanas integradas (iframes). Al abrir en pestaña completa, el navegador te solicitará el permiso normalmente.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir App en Pestaña Completa</span>
                </button>
              </div>
            )}

            {/* Test Action */}
            <div className="pt-1 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleTestPermission}
                disabled={isTesting}
                className="flex-1 py-2.5 px-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Solicitando Permiso...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-amber-400" />
                    <span>Probar / Solicitar Permiso Ahora</span>
                  </>
                )}
              </button>

              {!inIframe && (
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="py-2.5 px-3 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Nueva Pestaña</span>
                </button>
              )}
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <MicOff className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Step-by-Step Instructions by Platform */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              Cómo desbloquear el micrófono paso a paso:
            </h3>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('chrome-pc')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  activeTab === 'chrome-pc'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Chrome / PC</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  activeTab === 'android'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android Móvil</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  activeTab === 'ios'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Apple className="w-3.5 h-3.5" />
                <span>iPhone / Safari</span>
              </button>
            </div>

            {/* Tab: Chrome PC */}
            {activeTab === 'chrome-pc' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-[11px]">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    1
                  </span>
                  <p>
                    En la barra de direcciones de Chrome o Edge, haz clic en el <strong>icono de candado 🔒</strong> o el icono de <strong>ajustes de sitio (ajustes/interruptores)</strong> a la izquierda de la dirección URL.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    2
                  </span>
                  <p>
                    Busca la opción <strong>"Micrófono"</strong> y cámbiala a <strong>"Permitir"</strong> (o activa el interruptor).
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    3
                  </span>
                  <p>
                    Haz clic en el botón <strong>"Volver a cargar" (Recargar)</strong> que aparecerá en tu navegador.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Android Chrome */}
            {activeTab === 'android' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-[11px]">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    1
                  </span>
                  <p>
                    En Chrome en tu celular, toca los <strong>tres puntos verticales (⋮)</strong> en la esquina superior derecha y entra a <strong>Configuración</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    2
                  </span>
                  <p>
                    Desplázate hacia abajo y toca <strong>Configuración de sitios</strong> ➔ <strong>Micrófono</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    3
                  </span>
                  <p>
                    Asegúrate de que no esté bloqueado y pulsa en la dirección de la app para seleccionar <strong>"Permitir"</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: iOS Safari */}
            {activeTab === 'ios' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-[11px]">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    1
                  </span>
                  <p>
                    En Safari en iPhone, toca el botón <strong>"aA"</strong> en la barra de búsqueda / direcciones.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    2
                  </span>
                  <p>
                    Toca en <strong>Configuración del sitio web</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    3
                  </span>
                  <p>
                    En la sección <strong>Micrófono</strong>, selecciona <strong>"Permitir"</strong> y recarga la página.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-mono">
            Comercial Walter • Asistente IA
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl text-xs hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer"
          >
            Entendido / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
