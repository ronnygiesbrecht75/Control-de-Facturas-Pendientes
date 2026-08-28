/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Invoice, PaymentMethod, PaymentDetails } from '../types';
import { formatPYG, formatInvoiceNumber, formatDateDMY } from '../utils/mockData';
import { parsePaymentWithAI, ParsedVoicePayment } from '../utils/aiVoicePayment';
import MicPermissionModal from './MicPermissionModal';
import {
  checkMicrophonePermission,
  requestMicrophoneAccess,
  isAppInIframe,
  AudioRecorderSession,
  MicPermissionStatus
} from '../utils/microphoneManager';
import { 
  Smartphone, 
  CreditCard, 
  CheckCircle2, 
  Search, 
  Banknote, 
  Building2, 
  FileCheck, 
  Calendar, 
  Truck,
  Hash,
  AlertCircle,
  RefreshCw,
  Mic,
  MicOff,
  Sparkles,
  Zap,
  Volume2,
  Check,
  RotateCcw,
  ArrowRight,
  HelpCircle,
  X,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface CobroMovilRepartidorProps {
  invoices: Invoice[];
  onRegisterMobilePayment: (
    invoiceId: string,
    details: PaymentDetails,
    sucursal: string,
    caja: string,
    numero: string,
    clientName?: string
  ) => void;
  systemDate: string;
}

const COMMON_BANKS = [
  'Banco Itaú',
  'Banco Continental',
  'Sudameris Bank',
  'Banco Familiar',
  'Banco Atlas',
  'Banco GNB',
  'BNF (Banco Nacional de Fomento)',
  'Ueno Bank',
  'Banco Basa',
  'Bancop',
  'Otro Banco'
];

const VOICE_EXAMPLES = [
  'Cobré 150 mil en efectivo de la factura 6493 a Despensa El Sol',
  'Factura 1042 pago de 400.000 transferencia de Banco Itaú',
  'Cheque al día de 1.200.000 Banco Continental factura 001-009-0005510',
  'Cobro de 800 mil en efectivo al cliente Los Hermanos'
];

export default function CobroMovilRepartidor({
  invoices,
  onRegisterMobilePayment,
  systemDate
}: CobroMovilRepartidorProps) {
  // Input refs for Enter navigation
  const sucursalInputRef = useRef<HTMLInputElement>(null);
  const cajaInputRef = useRef<HTMLInputElement>(null);
  const numeroInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // --- FORM STATES ---
  const [paymentDate, setPaymentDate] = useState<string>(systemDate);
  
  // Número de factura Paraguay style: Sucursal (3) - Caja (3) - Número (7)
  const [sucursal, setSucursal] = useState<string>('001');
  const [caja, setCaja] = useState<string>('009');
  const [numero, setNumero] = useState<string>('');
  
  // Optional client name if creating or referencing
  const [clientName, setClientName] = useState<string>('');
  
  // Monto cobrado
  const [amount, setAmount] = useState<number | ''>('');
  
  // Método de pago selection
  const [method, setMethod] = useState<PaymentMethod>('Efectivo');
  
  // Conditional fields
  const [bankName, setBankName] = useState<string>('');
  const [customBank, setCustomBank] = useState<string>('');
  const [transferReceipt, setTransferReceipt] = useState<string>('');
  
  // Check fields
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [checkIssueDate, setCheckIssueDate] = useState<string>(systemDate);
  const [checkDepositDate, setCheckDepositDate] = useState<string>(systemDate);

  // Status & Feedback
  const [matchedInvoice, setMatchedInvoice] = useState<Invoice | null>(null);
  const [submittedNotice, setSubmittedNotice] = useState<{
    invoiceNum: string;
    amount: number;
    method: string;
    date: string;
    clientName?: string;
  } | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // --- VOICE & AI ASSISTANT STATES ---
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [lastAIResult, setLastAIResult] = useState<ParsedVoicePayment | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [showVoiceHelp, setShowVoiceHelp] = useState<boolean>(false);
  const [showMicModal, setShowMicModal] = useState<boolean>(false);
  const [micStatus, setMicStatus] = useState<MicPermissionStatus>('prompt');
  const [inIframe, setInIframe] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioRecordingActive, setAudioRecordingActive] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const audioRecorderRef = useRef<AudioRecorderSession | null>(null);
  const recordingTimerRef = useRef<any>(null);

  // Check speech recognition support and microphone status on mount
  useEffect(() => {
    setInIframe(isAppInIframe());
    checkMicrophonePermission().then((status) => {
      setMicStatus(status);
    });

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }

    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioRecorderRef.current) audioRecorderRef.current.abort();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Common application of parsed payment to form
  const applyAIResult = (parsed: ParsedVoicePayment) => {
    setLastAIResult(parsed);

    // Auto-populate form fields from AI extraction
    if (parsed.sucursal) setSucursal(parsed.sucursal);
    if (parsed.caja) setCaja(parsed.caja);
    if (parsed.numero) setNumero(parsed.numero);
    if (parsed.clientName) setClientName(parsed.clientName);
    if (parsed.amount) setAmount(parsed.amount);
    if (parsed.paymentMethod) setMethod(parsed.paymentMethod);
    if (parsed.paymentDate) setPaymentDate(parsed.paymentDate);
    if (parsed.bankName) {
      if (COMMON_BANKS.includes(parsed.bankName)) {
        setBankName(parsed.bankName);
      } else {
        setBankName('Otro Banco');
        setCustomBank(parsed.bankName);
      }
    }
    if (parsed.transferReceipt) setTransferReceipt(parsed.transferReceipt);
    if (parsed.checkNumber) setCheckNumber(parsed.checkNumber);
    if (parsed.checkIssueDate) setCheckIssueDate(parsed.checkIssueDate);
    if (parsed.checkDepositDate) setCheckDepositDate(parsed.checkDepositDate);

    // If matched invoice
    if (parsed.matchedInvoiceId) {
      const found = invoices.find(i => i.id === parsed.matchedInvoiceId);
      if (found) {
        setMatchedInvoice(found);
      }
    }
  };

  // Start voice recording with explicit permission handling & fallback
  const startVoiceRecording = async () => {
    setErrorNotice(null);
    setVoiceTranscript('');
    setLastAIResult(null);

    // 1. Explicitly request microphone stream so browser shows permission prompt if needed
    const permission = await requestMicrophoneAccess();
    if (!permission.granted) {
      setMicStatus('denied');
      setErrorNotice(
        permission.errorMessage ||
        'Permiso de micrófono no otorgado. Puedes desbloquearlo en los ajustes del navegador o en una nueva pestaña.'
      );
      setShowMicModal(true);
      return;
    }

    setMicStatus('granted');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    // Try browser SpeechRecognition first if supported
    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch (e) {}
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-PY'; // Spanish (Paraguay) or default Spanish
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setRecordingSeconds(0);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = setInterval(() => {
            setRecordingSeconds((prev) => prev + 1);
          }, 1000);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setVoiceTranscript(currentTranscript);
        };

        recognition.onerror = async (event: any) => {
          console.warn('Speech recognition error:', event.error);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          setIsListening(false);

          if (event.error === 'not-allowed') {
            setMicStatus('denied');
            setErrorNotice('Permiso de micrófono denegado en el navegador. Haz clic en "Permisos de Micrófono" para solucionarlo.');
            setShowMicModal(true);
          } else if (event.error === 'service-not-allowed' || event.error === 'network') {
            // If Speech recognition service fails on mobile, fall back to direct audio recording
            console.log('WebSpeech service failed, attempting direct MediaRecorder audio recording...');
            startDirectAudioRecording();
          } else if (event.error !== 'no-speech') {
            setErrorNotice(`Error en reconocimiento de voz (${event.error}). Puedes reintentar hablar.`);
          }
        };

        recognition.onend = () => {
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err: any) {
        console.warn('Error starting WebSpeech, falling back to direct audio recording:', err);
      }
    }

    // Direct audio recording fallback if SpeechRecognition is unavailable
    await startDirectAudioRecording();
  };

  // Direct Audio Recording via MediaRecorder
  const startDirectAudioRecording = async () => {
    try {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.abort();
      }

      const recorder = new AudioRecorderSession();
      await recorder.start();
      audioRecorderRef.current = recorder;
      setAudioRecordingActive(true);
      setIsListening(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start audio recording:', err);
      setIsListening(false);
      setAudioRecordingActive(false);
      setErrorNotice('No se pudo acceder al micrófono para grabar audio. Verifica los permisos.');
      setShowMicModal(true);
    }
  };

  // Stop recording (works for both WebSpeech and MediaRecorder)
  const stopVoiceRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (audioRecorderRef.current && audioRecordingActive) {
      setIsListening(false);
      setAudioRecordingActive(false);
      setIsProcessingAI(true);
      try {
        const audioData = await audioRecorderRef.current.stop();
        audioRecorderRef.current = null;

        if (audioData.base64 && audioData.durationMs > 400) {
          await handleProcessAudioWithAI(audioData.base64, audioData.mimeType);
        } else {
          setErrorNotice('El audio fue demasiado breve. Habla claro indicando cliente, monto y factura.');
        }
      } catch (err: any) {
        console.error('Error stopping audio recorder:', err);
        setErrorNotice('Ocurrió un error al procesar el audio grabado.');
      } finally {
        setIsProcessingAI(false);
      }
      return;
    }

    setIsListening(false);
  };

  // When speech ends and we have a transcript, process with Gemini AI
  useEffect(() => {
    if (!isListening && voiceTranscript.trim().length > 3 && !audioRecordingActive) {
      handleProcessVoiceWithAI(voiceTranscript);
    }
  }, [isListening]);

  // Process live text transcript with Gemini AI
  const handleProcessVoiceWithAI = async (transcriptToProcess: string) => {
    setIsProcessingAI(true);
    setErrorNotice(null);

    try {
      const parsed = await parsePaymentWithAI(transcriptToProcess, invoices, systemDate);
      applyAIResult(parsed);
    } catch (err: any) {
      console.error('AI voice processing error:', err);
      setErrorNotice('No se pudo interpretar el dictado con IA. Puedes reintentar o completar los campos manualmente.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Process raw audio with Gemini AI
  const handleProcessAudioWithAI = async (audioBase64: string, audioMimeType: string) => {
    setIsProcessingAI(true);
    setErrorNotice(null);
    setVoiceTranscript('(Audio procesado por Gemini)');

    try {
      const parsed = await parsePaymentWithAI('', invoices, systemDate, audioBase64, audioMimeType);
      applyAIResult(parsed);
    } catch (err: any) {
      console.error('AI voice audio processing error:', err);
      setErrorNotice('No se pudo interpretar el audio con IA. Intenta hablar nuevamente más cerca del micrófono.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Instant 1-Click Registration from AI result
  const handleConfirmDirectAI = () => {
    if (!lastAIResult) return;

    const suc = (lastAIResult.sucursal || sucursal || '001').trim().padStart(3, '0');
    const caj = (lastAIResult.caja || caja || '009').trim().padStart(3, '0');
    const num = (lastAIResult.numero || numero || '').trim().padStart(7, '0');
    const numValue = Number(lastAIResult.amount || amount || 0);

    if (!num.replace(/^0+/, '')) {
      setErrorNotice('Falta el número de factura para registrar el pago.');
      return;
    }

    if (numValue <= 0) {
      setErrorNotice('Falta un monto válido para registrar el pago.');
      return;
    }

    const invoiceIdToUse = lastAIResult.matchedInvoiceId || (matchedInvoice ? matchedInvoice.id : `mob-inv-${Date.now()}`);
    const methodToUse = lastAIResult.paymentMethod || method || 'Efectivo';

    const paymentData: PaymentDetails = {
      paymentDate: lastAIResult.paymentDate || paymentDate || systemDate,
      paymentMethod: methodToUse,
      amount: numValue,
      registeredBy: 'Repartidor (Voz IA)',
      registeredAt: new Date().toISOString()
    };

    if (methodToUse === 'Transferencia') {
      paymentData.bankName = lastAIResult.bankName || selectedBank || 'Banco Itaú';
      if (lastAIResult.transferReceipt || transferReceipt) {
        paymentData.transferReceipt = (lastAIResult.transferReceipt || transferReceipt).trim();
      }
    } else if (methodToUse === 'Cheque al día') {
      paymentData.checkNumber = (lastAIResult.checkNumber || checkNumber || '000000').trim();
      paymentData.bankName = lastAIResult.bankName || selectedBank || 'Banco Itaú';
    } else if (methodToUse === 'Cheque diferido') {
      paymentData.checkNumber = (lastAIResult.checkNumber || checkNumber || '000000').trim();
      paymentData.bankName = lastAIResult.bankName || selectedBank || 'Banco Itaú';
      paymentData.checkIssueDate = lastAIResult.checkIssueDate || checkIssueDate || systemDate;
      paymentData.checkDepositDate = lastAIResult.checkDepositDate || checkDepositDate || systemDate;
    }

    // Submit payment
    onRegisterMobilePayment(
      invoiceIdToUse,
      paymentData,
      suc,
      caj,
      num,
      lastAIResult.clientName || clientName
    );

    // Show success summary
    setSubmittedNotice({
      invoiceNum: formatInvoiceNumber(suc, caj, num),
      amount: numValue,
      method: methodToUse,
      date: formatDateDMY(paymentData.paymentDate),
      clientName: lastAIResult.clientName || clientName
    });

    // Reset fields
    setNumero('');
    setClientName('');
    setAmount('');
    setTransferReceipt('');
    setCheckNumber('');
    setBankName('');
    setCustomBank('');
    setMatchedInvoice(null);
    setLastAIResult(null);
    setVoiceTranscript('');
  };

  // Auto-search and match existing unpaid invoices as the user types Sucursal - Caja - Numero
  useEffect(() => {
    if (!numero.trim()) {
      setMatchedInvoice(null);
      return;
    }

    const cleanSuc = sucursal.trim().padStart(3, '0');
    const cleanCaj = caja.trim().padStart(3, '0');
    const cleanNum = numero.trim().padStart(7, '0');

    const found = invoices.find(inv => {
      const matchSuc = inv.sucursal.trim().padStart(3, '0') === cleanSuc;
      const matchCaj = inv.caja.trim().padStart(3, '0') === cleanCaj;
      const matchNum = inv.numero.trim().padStart(7, '0') === cleanNum;
      return matchSuc && matchCaj && matchNum;
    });

    if (found) {
      setMatchedInvoice(found);
      if (!clientName) {
        setClientName(found.clientName);
      }
      if (amount === '' || amount === 0) {
        setAmount(found.amount);
      }
    } else {
      setMatchedInvoice(null);
    }
  }, [sucursal, caja, numero, invoices]);

  const selectedBank = bankName === 'Otro Banco' ? customBank : bankName;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    // Validations
    if (!numero.trim()) {
      setErrorNotice('Por favor ingrese el número de factura.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setErrorNotice('Ingrese un monto cobrado válido mayor a 0 Gs.');
      return;
    }

    // Method specific validations
    if (method === 'Transferencia') {
      if (!selectedBank.trim()) {
        setErrorNotice('Por favor seleccione o ingrese el nombre del Banco.');
        return;
      }
    } else if (method === 'Cheque al día') {
      if (!checkNumber.trim()) {
        setErrorNotice('Por favor ingrese el número de cheque.');
        return;
      }
      if (!selectedBank.trim()) {
        setErrorNotice('Por favor ingrese el Banco del cheque.');
        return;
      }
    } else if (method === 'Cheque diferido') {
      if (!checkNumber.trim()) {
        setErrorNotice('Por favor ingrese el número de cheque.');
        return;
      }
      if (!selectedBank.trim()) {
        setErrorNotice('Por favor ingrese el Banco del cheque.');
        return;
      }
      if (!checkIssueDate) {
        setErrorNotice('Ingrese la Fecha de Emisión del cheque diferido.');
        return;
      }
      if (!checkDepositDate) {
        setErrorNotice('Ingrese la Fecha del Pago / Cobro del cheque diferido.');
        return;
      }
    }

    const numValue = Number(amount);
    const invoiceIdToUse = matchedInvoice ? matchedInvoice.id : `mob-inv-${Date.now()}`;

    // Construct payment details object
    const paymentData: PaymentDetails = {
      paymentDate: paymentDate || systemDate,
      paymentMethod: method,
      amount: numValue,
      registeredBy: lastAIResult ? 'Repartidor (Voz IA)' : 'Repartidor (Móvil)',
      registeredAt: new Date().toISOString()
    };

    if (method === 'Transferencia') {
      paymentData.bankName = selectedBank;
      if (transferReceipt.trim()) {
        paymentData.transferReceipt = transferReceipt.trim();
      }
    } else if (method === 'Cheque al día') {
      paymentData.checkNumber = checkNumber.trim();
      paymentData.bankName = selectedBank;
    } else if (method === 'Cheque diferido') {
      paymentData.checkNumber = checkNumber.trim();
      paymentData.bankName = selectedBank;
      paymentData.checkIssueDate = checkIssueDate;
      paymentData.checkDepositDate = checkDepositDate;
    }

    // Register mobile payment
    onRegisterMobilePayment(
      invoiceIdToUse,
      paymentData,
      sucursal.trim().padStart(3, '0'),
      caja.trim().padStart(3, '0'),
      numero.trim().padStart(7, '0'),
      clientName.trim()
    );

    // Show success summary
    setSubmittedNotice({
      invoiceNum: formatInvoiceNumber(sucursal, caja, numero),
      amount: numValue,
      method: method,
      date: formatDateDMY(paymentDate || systemDate),
      clientName: clientName.trim()
    });

    // Reset form fields for next delivery
    setNumero('');
    setClientName('');
    setAmount('');
    setTransferReceipt('');
    setCheckNumber('');
    setBankName('');
    setCustomBank('');
    setMatchedInvoice(null);
    setLastAIResult(null);
    setVoiceTranscript('');

    // Refocus invoice number for rapid consecutive payments
    setTimeout(() => {
      numeroInputRef.current?.focus();
    }, 50);
  };

  const handleResetForm = () => {
    setNumero('');
    setClientName('');
    setAmount('');
    setTransferReceipt('');
    setCheckNumber('');
    setBankName('');
    setCustomBank('');
    setMatchedInvoice(null);
    setLastAIResult(null);
    setVoiceTranscript('');
    setErrorNotice(null);
  };

  const handleKeyDownNext = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextRef: React.RefObject<HTMLInputElement | HTMLButtonElement | null>,
    selectContent: boolean = false
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef.current) {
        nextRef.current.focus();
        if (selectContent && 'select' in nextRef.current && typeof nextRef.current.select === 'function') {
          (nextRef.current as HTMLInputElement).select();
        }
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 animate-fade-in pb-16">
      
      {/* Header Banner - Clean mobile delivery header */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 rounded-2xl p-4 sm:p-5 text-slate-950 shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-slate-950/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider text-slate-950 uppercase">
            <Smartphone className="w-3 h-3" />
            Edición Móvil Repartidor
          </div>
          <h2 className="text-lg sm:text-xl font-black font-display tracking-tight leading-tight">
            Cobro en Reparto
          </h2>
          <p className="text-xs font-medium text-slate-900/85">
            Registra cobros rápidamente con el micrófono o completando el formulario
          </p>
        </div>
        <div className="bg-white/90 p-3 rounded-2xl shadow-md text-amber-600 flex-shrink-0">
          <Truck className="w-7 h-7" />
        </div>
      </div>

      {/* Success Notification Banner */}
      {submittedNotice && (
        <div className="bg-emerald-500 text-white rounded-2xl p-5 shadow-xl border border-emerald-400 space-y-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-sm leading-tight">¡Pago Registrado con Éxito!</h3>
              <p className="text-xs text-emerald-100">Sincronizado inmediatamente con el sistema central.</p>
            </div>
          </div>

          <div className="bg-emerald-600/50 rounded-xl p-3 text-xs font-mono space-y-1 border border-emerald-400/40">
            {submittedNotice.clientName && (
              <p><span className="text-emerald-200">Cliente:</span> {submittedNotice.clientName}</p>
            )}
            <p><span className="text-emerald-200">Factura:</span> {submittedNotice.invoiceNum}</p>
            <p><span className="text-emerald-200">Monto:</span> {formatPYG(submittedNotice.amount)}</p>
            <p><span className="text-emerald-200">Método:</span> {submittedNotice.method}</p>
            <p><span className="text-emerald-200">Fecha:</span> {submittedNotice.date}</p>
          </div>

          <button
            type="button"
            onClick={() => setSubmittedNotice(null)}
            className="w-full py-2.5 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>+ Cargar Otro Cobro de Reparto</span>
          </button>
        </div>
      )}

      {/* Main Registration Form Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Form Card Header - Matches user's screenshot: [💳 Formulario de Pago] [🎙️ Dictar por Voz (IA) ✨] [❓ Ejemplos] [PYG] */}
        <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
              Formulario de Pago
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Button: Dictar por Voz (IA) */}
            <button
              type="button"
              onClick={isListening ? stopVoiceRecording : startVoiceRecording}
              disabled={isProcessingAI}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-md'
                  : isProcessingAI
                  ? 'bg-amber-400 text-slate-950 opacity-90 cursor-wait'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-md active:scale-95'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 animate-bounce text-white" />
                  <span>Detener ({recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}s)</span>
                </>
              ) : isProcessingAI ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Interpretando con IA...</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-slate-950" />
                  <span>Dictar por Voz (IA)</span>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>

            {/* Button: Ejemplos */}
            <button
              type="button"
              onClick={() => setShowVoiceHelp(!showVoiceHelp)}
              className="px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 bg-[#FFF4E5] dark:bg-amber-950/40 text-[#D97706] dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-[#D97706] dark:text-amber-400" />
              <span>Ejemplos</span>
            </button>

            {/* Badge: PYG */}
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              PYG
            </span>
          </div>
        </div>

        {/* Active Voice Recording Bar (shown when listening or processing) */}
        {(isListening || isProcessingAI) && (
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-b border-amber-300/40 dark:border-amber-500/30 flex flex-wrap items-center justify-between gap-2.5 animate-fade-in">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isListening ? (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Escuchando voz... (00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds})
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Gemini 3.7 completando los campos del cobro...</span>
                </div>
              )}

              {voiceTranscript && (
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300 italic truncate hidden sm:inline">
                  "{voiceTranscript}"
                </span>
              )}
            </div>

            {isListening && (
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="px-3.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-full shadow transition-colors cursor-pointer"
              >
                Terminar y Procesar
              </button>
            )}
          </div>
        )}

        {/* Permission Denied Alert Bar */}
        {micStatus === 'denied' && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex flex-wrap items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>El navegador no tiene permiso para usar el micrófono.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMicModal(true)}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] cursor-pointer"
              >
                Ver Cómo Desbloquearlo
              </button>
              <button
                type="button"
                onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-[11px] cursor-pointer flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3 text-amber-500" />
                Pestaña Completa
              </button>
            </div>
          </div>
        )}

        {/* Examples Drawer */}
        {showVoiceHelp && (
          <div className="p-3.5 bg-amber-50/80 dark:bg-slate-900 border-b border-amber-200 dark:border-slate-700 text-xs space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Ejemplos de frases que puedes dictar por voz:
              </p>
              <button
                type="button"
                onClick={() => setShowVoiceHelp(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {VOICE_EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setVoiceTranscript(ex);
                    handleProcessVoiceWithAI(ex);
                    setShowVoiceHelp(false);
                  }}
                  className="w-full text-left p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-100/60 dark:hover:bg-slate-700 text-[11px] font-mono text-slate-800 dark:text-slate-200 border border-amber-200/60 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span className="truncate mr-2">"{ex}"</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-sans font-bold flex-shrink-0">
                    Probar con IA →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Interpretation Card (1-Click Fast Register) */}
        {lastAIResult && (
          <div className="m-3.5 sm:m-4 p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 rounded-xl border border-emerald-300 dark:border-emerald-700/60 space-y-2.5 animate-fade-in shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Datos extraídos por IA y cargados en el formulario</span>
              </div>
              {lastAIResult.confidence && (
                <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">
                  {Math.round(lastAIResult.confidence * 100)}% Coincidencia
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-200 dark:border-slate-700 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Factura:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {formatInvoiceNumber(lastAIResult.sucursal || sucursal || '001', lastAIResult.caja || caja || '009', lastAIResult.numero || numero || '0000000')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Monto:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                  {formatPYG(Number(lastAIResult.amount || amount || 0))}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Método:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{lastAIResult.paymentMethod || method}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Cliente:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 truncate block">
                  {lastAIResult.clientName || clientName || 'Por definir'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmDirectAI}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>⚡ Registrar Pago de Inmediato</span>
              </button>
              <button
                type="button"
                onClick={() => setLastAIResult(null)}
                className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg text-xs border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
              >
                Modificar en Campos
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {errorNotice && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-xl border border-rose-200 dark:border-rose-800/60 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* 1. Fecha del Pago */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              Fecha del Pago
            </label>
            <input
              id="mob-payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              onKeyDown={(e) => handleKeyDownNext(e, sucursalInputRef, true)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          {/* 2. Número de Factura (Sucursal - Caja - Número) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-amber-500" />
              Número de Factura (Sucursal - Caja - Número)
            </label>
            
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <span className="text-[9px] text-slate-400 font-mono block mb-0.5 text-center">Sucursal</span>
                <input
                  id="mob-sucursal"
                  ref={sucursalInputRef}
                  type="text"
                  maxLength={3}
                  value={sucursal}
                  onChange={(e) => setSucursal(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleKeyDownNext(e, cajaInputRef, true)}
                  placeholder="001"
                  className="w-full px-2 py-2 text-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="col-span-3">
                <span className="text-[9px] text-slate-400 font-mono block mb-0.5 text-center">Caja</span>
                <input
                  id="mob-caja"
                  ref={cajaInputRef}
                  type="text"
                  maxLength={3}
                  value={caja}
                  onChange={(e) => setCaja(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleKeyDownNext(e, numeroInputRef, true)}
                  placeholder="009"
                  className="w-full px-2 py-2 text-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="col-span-6">
                <span className="text-[9px] text-slate-400 font-mono block mb-0.5">Nº Factura</span>
                <input
                  id="mob-numero"
                  ref={numeroInputRef}
                  type="text"
                  maxLength={7}
                  value={numero}
                  onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleKeyDownNext(e, amountInputRef, true)}
                  placeholder="0006493"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* If matched an existing invoice in system */}
            {matchedInvoice ? (
              <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs flex items-center justify-between animate-fade-in">
                <div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase block">
                    ✓ Factura Encontrada en Sistema
                  </span>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{matchedInvoice.clientName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Total:</span>
                  <p className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatPYG(matchedInvoice.amount)}</p>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Nombre del Cliente (Opcional):
                </label>
                <input
                  id="mob-client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  onKeyDown={(e) => handleKeyDownNext(e, amountInputRef)}
                  placeholder="Ej. Comercial Los Hermanos"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* 3. Monto Cobrado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-amber-500" />
                Monto Cobrado (Guaraníes)
              </span>
              {amount !== '' && Number(amount) > 0 && (
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                  {formatPYG(Number(amount))}
                </span>
              )}
            </label>
            <input
              id="mob-amount"
              ref={amountInputRef}
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              onKeyDown={(e) => handleKeyDownNext(e, submitBtnRef)}
              placeholder="Ej. 1500000"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 text-base font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          {/* 4. Método de Pago Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Método de Pago
            </label>

            <div className="grid grid-cols-2 gap-2">
              {(['Efectivo', 'Transferencia', 'Cheque al día', 'Cheque diferido'] as const).map((m) => {
                const active = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                      active
                        ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 border-slate-900 dark:border-amber-500 shadow-md scale-[1.02]'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {m === 'Efectivo' && <Banknote className="w-4 h-4" />}
                    {m === 'Transferencia' && <Building2 className="w-4 h-4" />}
                    {m === 'Cheque al día' && <FileCheck className="w-4 h-4" />}
                    {m === 'Cheque diferido' && <Calendar className="w-4 h-4" />}
                    <span>{m}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Method Details */}
          
          {/* A. Efectivo */}
          {method === 'Efectivo' && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800/40 font-medium">
              ✓ Se registrará como **Cobro en Efectivo** al contado por el monto especificado.
            </div>
          )}

          {/* B. Transferencia */}
          {method === 'Transferencia' && (
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Detalles de la Transferencia Bancaria
              </span>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="mob-trans-bank">
                  Banco emisor / receptor *
                </label>
                <select
                  id="mob-trans-bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none font-semibold"
                  required
                >
                  <option value="">Seleccione el Banco...</option>
                  {COMMON_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {bankName === 'Otro Banco' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="mob-trans-custom-bank">
                    Especifique el Banco *
                  </label>
                  <input
                    id="mob-trans-custom-bank"
                    type="text"
                    value={customBank}
                    onChange={(e) => setCustomBank(e.target.value)}
                    placeholder="Ej. Banco Sudameris"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="mob-trans-receipt">
                  Número de Comprobante / Transacción (Opcional)
                </label>
                <input
                  id="mob-trans-receipt"
                  type="text"
                  value={transferReceipt}
                  onChange={(e) => setTransferReceipt(e.target.value)}
                  placeholder="Ej. TR-982301"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* C. Cheque al Día */}
          {method === 'Cheque al día' && (
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Detalles de Cheque al Día
              </span>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="mob-check-num-dia">
                  Número de Cheque *
                </label>
                <input
                  id="mob-check-num-dia"
                  type="text"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="Ej. 00482910"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="mob-check-bank-dia">
                  Banco del Cheque *
                </label>
                <select
                  id="mob-check-bank-dia"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none font-semibold"
                  required
                >
                  <option value="">Seleccione el Banco del Cheque...</option>
                  {COMMON_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {bankName === 'Otro Banco' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="mob-custom-bank-dia">
                    Especifique el Banco *
                  </label>
                  <input
                    id="mob-custom-bank-dia"
                    type="text"
                    value={customBank}
                    onChange={(e) => setCustomBank(e.target.value)}
                    placeholder="Ej. Banco Continental"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* D. Cheque Diferido */}
          {method === 'Cheque diferido' && (
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Detalles de Cheque Diferido
              </span>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="mob-check-num-dif">
                  Número de Cheque *
                </label>
                <input
                  id="mob-check-num-dif"
                  type="text"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="Ej. 00891023"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="mob-check-bank-dif">
                  Banco del Cheque *
                </label>
                <select
                  id="mob-check-bank-dif"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none font-semibold"
                  required
                >
                  <option value="">Seleccione el Banco del Cheque...</option>
                  {COMMON_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {bankName === 'Otro Banco' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="mob-custom-bank-dif">
                    Especifique el Banco *
                  </label>
                  <input
                    id="mob-custom-bank-dif"
                    type="text"
                    value={customBank}
                    onChange={(e) => setCustomBank(e.target.value)}
                    placeholder="Ej. Banco Itaú"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="mob-check-issue-date">
                    Fecha de Emisión *
                  </label>
                  <input
                    id="mob-check-issue-date"
                    type="date"
                    value={checkIssueDate}
                    onChange={(e) => setCheckIssueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="mob-check-deposit-date">
                    Fecha de Cobro *
                  </label>
                  <input
                    id="mob-check-deposit-date"
                    type="date"
                    value={checkDepositDate}
                    onChange={(e) => setCheckDepositDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none font-semibold text-amber-600 dark:text-amber-400 font-bold"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button & Reset */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              id="btn-submit-mobile-payment"
              ref={submitBtnRef}
              type="submit"
              className="flex-1 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-black rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-5 h-5" />
              <span>Registrar Pago en el Sistema</span>
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
              title="Limpiar todos los campos del formulario"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Limpiar</span>
            </button>
          </div>

        </form>

      </div>

      {/* Microphone Permission and Diagnosis Modal */}
      <MicPermissionModal
        isOpen={showMicModal}
        onClose={() => setShowMicModal(false)}
        onPermissionGranted={() => setMicStatus('granted')}
      />

    </div>
  );
}
