/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Invoice, PaymentMethod, PaymentDetails } from '../types';
import { formatPYG, formatInvoiceNumber, formatDateDMY } from '../utils/mockData';
import { parsePaymentWithAI, ParsedVoicePayment } from '../utils/aiVoicePayment';
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
  X
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
  const recognitionRef = useRef<any>(null);

  // Check speech recognition support on mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Initialize and handle speech recognition
  const startVoiceRecording = () => {
    setErrorNotice(null);
    setVoiceTranscript('');
    setLastAIResult(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrorNotice('El reconocimiento de voz no está disponible en este navegador. Puedes usar Chrome en tu celular.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'es-PY'; // Spanish (Paraguay) or default Spanish
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setVoiceTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorNotice('Permiso de micrófono denegado. Por favor permite el acceso al micrófono en el navegador.');
        } else if (event.error !== 'no-speech') {
          setErrorNotice(`Error en reconocimiento de voz: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setErrorNotice('No se pudo activar el micrófono.');
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // When speech ends and we have a transcript, process with Gemini AI
  useEffect(() => {
    if (!isListening && voiceTranscript.trim().length > 3) {
      handleProcessVoiceWithAI(voiceTranscript);
    }
  }, [isListening]);

  const handleProcessVoiceWithAI = async (transcriptToProcess: string) => {
    setIsProcessingAI(true);
    setErrorNotice(null);

    try {
      const parsed = await parsePaymentWithAI(transcriptToProcess, invoices, systemDate);
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
    } catch (err: any) {
      console.error('AI voice processing error:', err);
      setErrorNotice('No se pudo interpretar el dictado con IA. Puedes completar los campos manualmente.');
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
        
        {/* --- HEADER WITH CENTERED MICROPHONE BUTTON --- */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 relative">
          
          {/* Left Title */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <CreditCard className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
              Formulario de Pago
            </span>
          </div>

          {/* --- CENTER: PROMINENT MICROPHONE BUTTON --- */}
          <div className="flex items-center justify-center flex-1 mx-1">
            <div className="relative">
              {/* Pulsing ring when recording */}
              {isListening && (
                <>
                  <span className="animate-ping absolute -inset-1 rounded-full bg-rose-500 opacity-75"></span>
                  <span className="animate-pulse absolute -inset-2.5 rounded-full bg-amber-400 opacity-40"></span>
                </>
              )}

              <button
                type="button"
                onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                disabled={isProcessingAI}
                title={isListening ? 'Detener dictado' : 'Dictar cobro con el micrófono (IA)'}
                className={`relative z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-md transition-all transform active:scale-95 cursor-pointer select-none ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400'
                    : isProcessingAI
                    ? 'bg-amber-600 text-white cursor-wait animate-pulse'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 ring-2 ring-amber-400/50 hover:shadow-lg'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4 animate-bounce" />
                    <span className="hidden xs:inline sm:inline">Escuchando...</span>
                  </>
                ) : isProcessingAI ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="hidden xs:inline sm:inline">IA interpretando...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-slate-950" />
                    <span className="hidden xs:inline sm:inline font-black">Dictar por Voz (IA)</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-900 hidden sm:inline" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Help trigger and PYG badge */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowVoiceHelp(!showVoiceHelp)}
              title="Ver ejemplos de frases para dictar"
              className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ejemplos</span>
            </button>
            <span className="text-[10px] text-slate-500 font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
              PYG
            </span>
          </div>

        </div>

        {/* Voice Help Examples Drawer */}
        {showVoiceHelp && (
          <div className="p-3.5 bg-slate-900 text-white border-b border-slate-700 text-xs space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="font-bold text-amber-400 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" />
                Ejemplos de frases que puedes dictar:
              </p>
              <button
                type="button"
                onClick={() => setShowVoiceHelp(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {VOICE_EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setVoiceTranscript(ex);
                    handleProcessVoiceWithAI(ex);
                    setShowVoiceHelp(false);
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-200 border border-slate-700 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span className="truncate pr-1">"{ex}"</span>
                  <span className="text-amber-400 text-[10px] font-bold flex-shrink-0">Probar &rarr;</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Spoken Transcript Banner */}
        {isListening && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200 animate-fade-in">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="flex h-2 w-2 relative flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <p className="font-mono italic truncate">
                {voiceTranscript ? `"${voiceTranscript}"` : 'Habla ahora... Di el cliente, monto, número de factura o banco.'}
              </p>
            </div>
            <button
              type="button"
              onClick={stopVoiceRecording}
              className="text-[11px] font-bold bg-rose-600 text-white px-2.5 py-1 rounded-lg hover:bg-rose-700 transition-colors cursor-pointer flex-shrink-0"
            >
              Listo
            </button>
          </div>
        )}

        {/* --- AI INTERPRETATION SUCCESS CARD (1-CLICK CONFIRMATION) --- */}
        {lastAIResult && (
          <div className="m-3 sm:m-4 p-4 bg-gradient-to-br from-emerald-950/90 to-slate-900 text-white rounded-xl border-2 border-emerald-500/80 space-y-3 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-bold text-emerald-300">
                  Datos Extraídos por IA con Éxito
                </span>
              </div>
              {lastAIResult.confidence && (
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {Math.round(lastAIResult.confidence * 100)}% Coincidencia
                </span>
              )}
            </div>

            {/* Parsed Highlights Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/70 p-3 rounded-lg border border-emerald-900/60 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block">Factura:</span>
                <span className="font-bold text-amber-400">
                  {formatInvoiceNumber(lastAIResult.sucursal || sucursal || '001', lastAIResult.caja || caja || '009', lastAIResult.numero || numero || '0000000')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Monto:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {formatPYG(Number(lastAIResult.amount || amount || 0))}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Método:</span>
                <span className="font-bold text-slate-200">{lastAIResult.paymentMethod || method}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Cliente:</span>
                <span className="font-bold text-slate-200 truncate block">
                  {lastAIResult.clientName || clientName || 'Por definir'}
                </span>
              </div>
              {lastAIResult.bankName && (
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block">Banco:</span>
                  <span className="font-bold text-slate-200">{lastAIResult.bankName}</span>
                </div>
              )}
            </div>

            {lastAIResult.explanation && (
              <p className="text-[11px] text-slate-300">
                {lastAIResult.explanation}
              </p>
            )}

            {/* 1-Tap Action Button */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmDirectAI}
                className="col-span-2 sm:col-span-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>⚡ Registrar Pago de Inmediato</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLastAIResult(null);
                }}
                className="col-span-2 sm:col-span-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-600 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>✏️ Ajustar en Formulario</span>
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

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="btn-submit-mobile-payment"
              ref={submitBtnRef}
              type="submit"
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-black rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-5 h-5" />
              <span>Registrar Pago en el Sistema</span>
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
