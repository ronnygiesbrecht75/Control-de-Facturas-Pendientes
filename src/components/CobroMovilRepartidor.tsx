/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Invoice, PaymentMethod, PaymentDetails, Client } from '../types';
import { 
  formatPYG, 
  formatInvoiceNumber, 
  formatDateDMY, 
  getInvoiceStatus, 
  calculateDueDateString 
} from '../utils/mockData';
import { 
  Smartphone, 
  CreditCard, 
  CheckCircle2, 
  Banknote, 
  Building2, 
  FileCheck, 
  Calendar, 
  Truck,
  Hash,
  AlertCircle,
  Check,
  RotateCcw,
  Search,
  User,
  X,
  Clock,
  ChevronDown
} from 'lucide-react';

interface CobroMovilRepartidorProps {
  invoices: Invoice[];
  clients?: Client[];
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

export default function CobroMovilRepartidor({
  invoices,
  clients = [],
  onRegisterMobilePayment,
  systemDate
}: CobroMovilRepartidorProps) {
  // Input refs for Enter navigation
  const clientInputRef = useRef<HTMLInputElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const sucursalInputRef = useRef<HTMLInputElement>(null);
  const cajaInputRef = useRef<HTMLInputElement>(null);
  const numeroInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // --- FORM STATES ---
  const [paymentDate, setPaymentDate] = useState<string>(systemDate);
  
  // Client search & name
  const [clientName, setClientName] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Número de factura Paraguay style: Sucursal (3) - Caja (3) - Número (7)
  const [sucursal, setSucursal] = useState<string>('001');
  const [caja, setCaja] = useState<string>('009');
  const [numero, setNumero] = useState<string>('');
  
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

  // Facturas pendientes (sólo las no pagadas: "A Vencer" o "Vencido")
  const pendingInvoices = useMemo(() => {
    return invoices.filter((inv) => !inv.paid && getInvoiceStatus(inv, systemDate) !== 'Pagado');
  }, [invoices, systemDate]);

  // Facturas pendientes que coinciden con el texto que escribe el usuario
  const matchingPendingInvoices = useMemo(() => {
    const q = clientName.trim().toLowerCase();
    if (!q) return [];
    return pendingInvoices.filter((inv) => {
      const nameMatch = inv.clientName.toLowerCase().includes(q);
      const numMatch = inv.numero ? inv.numero.includes(q) : false;
      const formattedNum = formatInvoiceNumber(inv.sucursal, inv.caja, inv.numero).toLowerCase();
      const remMatch = inv.remisionNumero ? inv.remisionNumero.includes(q) : false;
      return nameMatch || numMatch || formattedNum.includes(q) || remMatch;
    });
  }, [pendingInvoices, clientName]);

  // Cerrar sugerencias al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(e.target as Node) &&
        clientInputRef.current &&
        !clientInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Auto-search and match existing unpaid invoices as the user types Sucursal - Caja - Numero
  useEffect(() => {
    if (!numero.trim()) {
      return;
    }

    const cleanSuc = sucursal.trim().padStart(3, '0');
    const cleanCaj = caja.trim().padStart(3, '0');
    const cleanNum = numero.trim().padStart(7, '0');

    const found = invoices.find(inv => {
      const matchSuc = (inv.sucursal || '').trim().padStart(3, '0') === cleanSuc;
      const matchCaj = (inv.caja || '').trim().padStart(3, '0') === cleanCaj;
      const matchNum = (inv.numero || '').trim().padStart(7, '0') === cleanNum;
      return matchSuc && matchCaj && matchNum;
    });

    if (found) {
      setMatchedInvoice(found);
      setClientName(found.clientName);
      if (amount === '' || amount === 0) {
        setAmount(found.amount);
      }
    } else {
      if (
        matchedInvoice &&
        (matchedInvoice.sucursal.trim().padStart(3, '0') !== cleanSuc ||
         matchedInvoice.caja.trim().padStart(3, '0') !== cleanCaj ||
         matchedInvoice.numero.trim().padStart(7, '0') !== cleanNum)
      ) {
        setMatchedInvoice(null);
      }
    }
  }, [sucursal, caja, numero, invoices]);

  // Seleccionar factura pendiente desde la búsqueda por cliente
  const handleSelectPendingInvoice = (inv: Invoice) => {
    setMatchedInvoice(inv);
    setClientName(inv.clientName);
    setSucursal(inv.sucursal ? inv.sucursal.trim().padStart(3, '0') : '001');
    setCaja(inv.caja ? inv.caja.trim().padStart(3, '0') : '009');
    setNumero(inv.numero ? inv.numero.trim().padStart(7, '0') : '');
    setAmount(inv.amount || 0);
    setShowSuggestions(false);
    setErrorNotice(null);

    // Mover foco a monto para confirmación rápida
    setTimeout(() => {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    }, 50);
  };

  const handleClearSelectedInvoice = () => {
    setMatchedInvoice(null);
    setClientName('');
    setNumero('');
    setAmount('');
    setShowSuggestions(false);
    setTimeout(() => {
      clientInputRef.current?.focus();
    }, 50);
  };

  const handleClientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || matchingPendingInvoices.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sucursalInputRef.current?.focus();
        sucursalInputRef.current?.select();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, matchingPendingInvoices.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matchingPendingInvoices[highlightedIndex]) {
        handleSelectPendingInvoice(matchingPendingInvoices[highlightedIndex]);
      } else {
        setShowSuggestions(false);
        sucursalInputRef.current?.focus();
        sucursalInputRef.current?.select();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

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
      registeredBy: 'Repartidor (Móvil)',
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
    setShowSuggestions(false);

    // Refocus client search or invoice number for rapid consecutive payments
    setTimeout(() => {
      clientInputRef.current?.focus();
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
    setShowSuggestions(false);
    setErrorNotice(null);
    setTimeout(() => {
      clientInputRef.current?.focus();
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
            Registra cobros rápidamente completando los datos de la factura
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
        
        {/* Form Card Header */}
        <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
              Formulario de Pago
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Badge: PYG */}
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              PYG
            </span>
          </div>
        </div>

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
              onKeyDown={(e) => handleKeyDownNext(e, clientInputRef)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          {/* 2. Cliente - Búsqueda de Facturas Pendientes */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="mob-client-name" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-500" />
                Nombre del Cliente
              </label>
              <span className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {pendingInvoices.length} pendientes
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="mob-client-name"
                ref={clientInputRef}
                type="text"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setShowSuggestions(true);
                  setHighlightedIndex(0);
                }}
                onFocus={() => {
                  if (clientName.trim().length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onKeyDown={handleClientKeyDown}
                placeholder="Escribe el nombre del cliente para buscar pendientes..."
                className="w-full pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                autoComplete="off"
              />
              {clientName && (
                <button
                  type="button"
                  onClick={() => {
                    setClientName('');
                    setShowSuggestions(false);
                    if (matchedInvoice) {
                      handleClearSelectedInvoice();
                    }
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  title="Borrar texto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown de Sugerencias de Facturas Pendientes */}
            {showSuggestions && clientName.trim().length > 0 && (
              <div
                ref={clientDropdownRef}
                className="absolute z-40 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-300/80 dark:border-amber-600/50 overflow-hidden animate-fade-in"
              >
                {matchingPendingInvoices.length > 0 ? (
                  <>
                    <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        Facturas Pendientes Encontradas ({matchingPendingInvoices.length})
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        Toca una para autocompletar
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {matchingPendingInvoices.map((inv, idx) => {
                        const invStatus = getInvoiceStatus(inv, systemDate);
                        const isVencido = invStatus === 'Vencido';
                        const formattedNum = formatInvoiceNumber(inv.sucursal, inv.caja, inv.numero);
                        const isHighlighted = idx === highlightedIndex;

                        return (
                          <div
                            key={inv.id}
                            onClick={() => handleSelectPendingInvoice(inv)}
                            className={`p-2.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                              isHighlighted
                                ? 'bg-amber-100/70 dark:bg-amber-950/60 border-l-4 border-amber-500'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {inv.clientName}
                                </span>
                                {inv.documentType === 'remision' ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                    Remisión
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    Factura
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-0.5">
                                  <Hash className="w-3 h-3 text-amber-500" />
                                  {formattedNum}
                                </span>
                                <span>•</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    isVencido
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  }`}
                                >
                                  {invStatus}
                                </span>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span className="font-mono font-extrabold text-xs text-amber-600 dark:text-amber-400 block">
                                {formatPYG(inv.amount)}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">
                                {formatDateDMY(inv.invoiceDate)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950">
                    <p className="font-medium">No hay facturas pendientes con este nombre.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Puedes ingresar el número de factura manualmente abajo.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tarjeta de Factura Seleccionada / Vinculada */}
            {matchedInvoice && (
              <div className="mt-2 p-2.5 bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-slate-900 rounded-xl border border-amber-300 dark:border-amber-600/60 text-xs flex items-center justify-between animate-fade-in shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950 flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                        Factura Pendiente Vinculada
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          getInvoiceStatus(matchedInvoice, systemDate) === 'Vencido'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : 'bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300'
                        }`}
                      >
                        {getInvoiceStatus(matchedInvoice, systemDate)}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                      {matchedInvoice.clientName}
                    </p>
                    <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                      Nº {formatInvoiceNumber(matchedInvoice.sucursal, matchedInvoice.caja, matchedInvoice.numero)} • Total: <strong className="text-amber-600 dark:text-amber-400">{formatPYG(matchedInvoice.amount)}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearSelectedInvoice}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-rose-300 transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0"
                  title="Desvincular factura y buscar otra"
                >
                  <X className="w-3 h-3" />
                  <span>Cambiar</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Número de Factura */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-amber-500" />
                Número de Factura
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Sucursal - Caja - Número
              </span>
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

    </div>
  );
}
