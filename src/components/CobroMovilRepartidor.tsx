/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Invoice, PaymentMethod, PaymentDetails } from '../types';
import { formatPYG, formatInvoiceNumber, formatDateDMY } from '../utils/mockData';
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
  RefreshCw
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
  } | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

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
      setClientName(found.clientName);
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
      date: formatDateDMY(paymentDate || systemDate)
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
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in pb-12">
      
      {/* Header Banner - Clean mobile delivery header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-5 text-slate-950 shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-slate-950/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider text-slate-950 uppercase">
            <Smartphone className="w-3 h-3" />
            Edición Móvil Repartidor
          </div>
          <h2 className="text-lg font-black font-display tracking-tight leading-tight">
            Cobro en Reparto
          </h2>
          <p className="text-xs font-medium text-slate-900/80">
            Registro rápido de pagos recibidos al entregar mercadería
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
            <p><span className="text-emerald-200">Factura:</span> {submittedNotice.invoiceNum}</p>
            <p><span className="text-emerald-200">Monto:</span> {formatPYG(submittedNotice.amount)}</p>
            <p><span className="text-emerald-200">Método:</span> {submittedNotice.method}</p>
            <p><span className="text-emerald-200">Fecha:</span> {submittedNotice.date}</p>
          </div>

          <button
            type="button"
            onClick={() => setSubmittedNotice(null)}
            className="w-full py-2 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            + Cargar Otro Cobro de Reparto
          </button>
        </div>
      )}

      {/* Main Registration Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-500" />
            Formulario de Pago
          </span>
          <span className="text-[10px] text-slate-500 font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            PYG (Gs.)
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          
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
              <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase block">
                    ✓ Factura Encontrada
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
              ✓ Se registrará como **Cobro en Efectivo** al contado por el monto total especificado.
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
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="mob-check-dep-date">
                    Fecha del Pago / Cobro *
                  </label>
                  <input
                    id="mob-check-dep-date"
                    type="date"
                    value={checkDepositDate}
                    onChange={(e) => setCheckDepositDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none font-bold text-amber-600 dark:text-amber-400"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="mob-submit-payment-btn"
            ref={submitBtnRef}
            type="submit"
            className="w-full py-3.5 bg-slate-900 dark:bg-amber-500 hover:bg-slate-950 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-black rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Registrar Pago de Reparto</span>
          </button>

        </form>
      </div>

    </div>
  );
}
