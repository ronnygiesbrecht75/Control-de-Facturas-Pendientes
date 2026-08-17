/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Invoice, InvoiceCategory, Client } from '../types';
import { formatPYG, formatInvoiceNumber } from '../utils/mockData';
import { PlusCircle, Info, FileText, Check } from 'lucide-react';

interface RegistrarFacturaProps {
  onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  systemDate: string;
  clients?: Client[];
}

export default function RegistrarFactura({ onAddInvoice, systemDate, clients = [] }: RegistrarFacturaProps) {
  // Input references for sequential Enter navigation
  const clientInputRef = useRef<HTMLInputElement>(null);
  const sucursalInputRef = useRef<HTMLInputElement>(null);
  const cajaInputRef = useRef<HTMLInputElement>(null);
  const numeroInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const termsInputRef = useRef<HTMLInputElement>(null);
  const paidAmountInputRef = useRef<HTMLInputElement>(null);
  const paymentDateInputRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // Local state for the register form
  const [category, setCategory] = useState<InvoiceCategory>('Facturas');
  const [clientName, setClientName] = useState('');
  
  // Paraguay invoice number components
  const [sucursal, setSucursal] = useState('001');
  const [caja, setCaja] = useState('009');
  const [numero, setNumero] = useState('');
  
  const [amount, setAmount] = useState<number>(0);
  const [invoiceDate, setInvoiceDate] = useState(systemDate);
  const [terms, setTerms] = useState<number>(0);
  const [paid, setPaid] = useState<boolean>(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(systemDate);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync dates when system date changes
  useEffect(() => {
    setInvoiceDate(systemDate);
    setPaymentDate(systemDate);
  }, [systemDate]);

  // Adjust paid amount when "paid" toggle is enabled
  useEffect(() => {
    if (paid && paidAmount === 0) {
      setPaidAmount(amount);
    }
  }, [paid, amount]);

  // Helper for sequential Enter key navigation
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

  const handleTermsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (paid && paidAmountInputRef.current) {
        paidAmountInputRef.current.focus();
        paidAmountInputRef.current.select();
      } else if (submitBtnRef.current) {
        submitBtnRef.current.focus();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      setNotification({ type: 'error', message: 'Por favor, ingrese el nombre del cliente.' });
      clientInputRef.current?.focus();
      return;
    }

    if (!numero.trim()) {
      setNotification({ type: 'error', message: 'Por favor, ingrese el número de factura.' });
      numeroInputRef.current?.focus();
      return;
    }

    if (amount <= 0) {
      setNotification({ type: 'error', message: 'El monto facturado debe ser mayor a cero.' });
      amountInputRef.current?.focus();
      return;
    }

    // Pad values
    const cleanSucursal = sucursal.padStart(3, '0').substring(0, 3);
    const cleanCaja = caja.padStart(3, '0').substring(0, 3);
    const cleanNumero = numero.padStart(7, '0').substring(0, 7);

    const newInvoice: Omit<Invoice, 'id'> = {
      category,
      clientName: clientName.trim(),
      sucursal: cleanSucursal,
      caja: cleanCaja,
      numero: cleanNumero,
      amount,
      invoiceDate,
      terms: terms || 0,
      paid,
      ...(paid ? { paidAmount: paidAmount || amount, paymentDate } : {})
    };

    onAddInvoice(newInvoice);

    // Reset fields for the next entry
    setClientName('');
    setNumero('');
    setAmount(0);
    setTerms(0);
    setPaid(false);
    setPaidAmount(0);
    setNotification({ type: 'success', message: '¡Factura registrada exitosamente!' });

    // Instantly refocus the very first field ("Nombre del Cliente") to start next entry with Enter
    setTimeout(() => {
      clientInputRef.current?.focus();
    }, 50);

    // Clear notification after 4 seconds
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Focus the first input field on component load
  useEffect(() => {
    clientInputRef.current?.focus();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Banner header styles */}
        <div className="bg-primary-gold p-5 text-slate-950 flex items-center gap-3">
          <PlusCircle className="w-6 h-6 text-slate-950" />
          <div>
            <h2 className="text-xl font-bold font-display">Registrar Nueva Factura</h2>
            <p className="text-xs font-semibold opacity-85">Cargue los documentos de facturación al sistema</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {notification && (
            <div className={`p-4 rounded-lg flex items-center gap-2 text-sm border ${
              notification.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40' 
                : 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
            }`}>
              <Info className="w-5 h-5 flex-shrink-0" />
              <span>{notification.message}</span>
            </div>
          )}

          {/* Form Selector for Category - chosen with mouse as specified */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Destino de Factura (Categoría - Selección con Mouse)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Facturas', 'Otras', 'Cristian'] as InvoiceCategory[]).map((cat) => {
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      clientInputRef.current?.focus();
                    }}
                    className={`py-3 px-4 rounded-lg border text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                      isActive 
                        ? 'bg-slate-900 dark:bg-primary-gold text-white dark:text-slate-950 border-slate-900 dark:border-primary-gold shadow-sm' 
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>{cat === 'Facturas' ? 'Facturas (General)' : cat === 'Otras' ? 'Otras Facturas' : 'Facturas de Cristian'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Nombre del Cliente */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="client-name">
                Nombre del Cliente
              </label>
              <input
                id="client-name"
                ref={clientInputRef}
                list="clients-datalist"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                onKeyDown={(e) => handleKeyDownNext(e, sucursalInputRef, true)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-medium"
                placeholder="Ej. Herrero Group S.A."
                required
              />
              <datalist id="clients-datalist">
                {clients.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            {/* 2. N° de Factura tipo Paraguay */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                N° de Factura (Sucursal - Caja - Número)
              </label>
              <div className="grid grid-cols-12 gap-1 items-center">
                <input
                  id="sucursal-input"
                  ref={sucursalInputRef}
                  aria-label="N° de Sucursal"
                  type="text"
                  maxLength={3}
                  value={sucursal}
                  onChange={(e) => setSucursal(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleKeyDownNext(e, cajaInputRef, true)}
                  className="col-span-3 text-center px-2 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-mono font-bold"
                  placeholder="001"
                />
                <span className="col-span-1 text-center text-slate-400 font-bold">-</span>
                <input
                  id="caja-input"
                  ref={cajaInputRef}
                  aria-label="N° de Caja"
                  type="text"
                  maxLength={3}
                  value={caja}
                  onChange={(e) => setCaja(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleKeyDownNext(e, numeroInputRef, true)}
                  className="col-span-3 text-center px-2 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-mono font-bold"
                  placeholder="009"
                />
                <span className="col-span-1 text-center text-slate-400 font-bold">-</span>
                <input
                  id="numero-input"
                  ref={numeroInputRef}
                  aria-label="N° de Factura"
                  type="text"
                  maxLength={7}
                  value={numero}
                  onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleKeyDownNext(e, amountInputRef, true)}
                  className="col-span-4 text-center px-2 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-mono font-bold"
                  placeholder="0006501"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                Vista Previa: <span className="font-bold text-slate-700 dark:text-slate-300">{formatInvoiceNumber(sucursal, caja, numero)}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 3. Monto Facturado */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="amount-input">
                Monto Facturado (₲)
              </label>
              <input
                id="amount-input"
                ref={amountInputRef}
                type="number"
                min={0}
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                onKeyDown={(e) => handleKeyDownNext(e, dateInputRef)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-mono font-bold"
                placeholder="Monto en Guaraníes"
                required
              />
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-mono mt-1 font-medium">
                {formatPYG(amount)} Gs.
              </p>
            </div>

            {/* 4. Fecha de Factura */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="date-input">
                Fecha de Factura
              </label>
              <input
                id="date-input"
                ref={dateInputRef}
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                onKeyDown={(e) => handleKeyDownNext(e, termsInputRef, true)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-semibold text-sm"
                required
              />
            </div>

            {/* 5. Término / Plazo (Días) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="terms-input">
                Término / Plazo (Días)
              </label>
              <input
                id="terms-input"
                ref={termsInputRef}
                type="number"
                min={0}
                value={terms || ''}
                onChange={(e) => setTerms(Number(e.target.value))}
                onKeyDown={handleTermsKeyDown}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-bold"
                placeholder="0"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Para el cálculo de Vencimientos
              </p>
            </div>
          </div>

          {/* ¿Pago? Marcar (SI) o (NO) */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  ¿La factura ya está cobrada/pagada?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Marque si la factura ya dispone de un registro de pago concreto.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaid(false)}
                  className={`py-1.5 px-4 rounded-lg font-bold text-xs transition-colors duration-150 cursor-pointer ${
                    !paid 
                      ? 'bg-rose-500 text-white shadow-sm' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                  }`}
                >
                  NO
                </button>
                <button
                  type="button"
                  onClick={() => setPaid(true)}
                  className={`py-1.5 px-4 rounded-lg font-bold text-xs transition-colors duration-150 cursor-pointer ${
                    paid 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                  }`}
                >
                  SÍ
                </button>
              </div>
            </div>

            {/* Conditionally reveal pago forms */}
            {paid && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700 animate-fade-in">
                {/* Monto de Pago */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="paid-amount-input">
                    Monto del Pago (Opcional)
                  </label>
                  <input
                    id="paid-amount-input"
                    ref={paidAmountInputRef}
                    type="number"
                    min={0}
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    onKeyDown={(e) => handleKeyDownNext(e, paymentDateInputRef)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    placeholder="Monto liquidado"
                  />
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 font-medium text-right">
                    Pagado: {formatPYG(paidAmount)} Gs.
                  </p>
                </div>

                {/* Fecha de Pago */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="payment-date-input">
                    Fecha del Pago (Opcional)
                  </label>
                  <input
                    id="payment-date-input"
                    ref={paymentDateInputRef}
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    onKeyDown={(e) => handleKeyDownNext(e, submitBtnRef)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              id="submit-register-invoice-btn"
              ref={submitBtnRef}
              type="submit"
              className="w-full py-3 bg-slate-900 dark:bg-primary-gold hover:bg-slate-950 dark:hover:bg-primary-gold-dark text-white dark:text-slate-950 font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-4 focus:ring-amber-500/50"
            >
              <PlusCircle className="w-5 h-5" />
              Guardar Factura Registrada
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
