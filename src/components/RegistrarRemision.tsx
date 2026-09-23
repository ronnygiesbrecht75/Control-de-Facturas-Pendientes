/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Invoice, InvoiceCategory, Client } from '../types';
import { formatPYG } from '../utils/mockData';
import { PlusCircle, Info, Truck, FileText, ChevronDown } from 'lucide-react';

interface RegistrarRemisionProps {
  onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  systemDate: string;
  clients?: Client[];
}

export default function RegistrarRemision({ 
  onAddInvoice, 
  systemDate,
  clients = [] 
}: RegistrarRemisionProps) {
  // Category default to 'Facturas' (Facturas General) as requested
  const [category, setCategory] = useState<InvoiceCategory>('Facturas');
  const [clientName, setClientName] = useState('');
  
  // Single number for Remisión as requested by user
  const [remisionNumero, setRemisionNumero] = useState('');
  
  const [amount, setAmount] = useState<number>(0);
  const [remisionDate, setRemisionDate] = useState(systemDate);
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Focus navigation refs for smooth sequential Enter key typing
  const clientInputRef = useRef<HTMLInputElement>(null);
  const remisionInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // Sync virtual system date whenever it changes
  useEffect(() => {
    setRemisionDate(systemDate);
  }, [systemDate]);

  // Focus the first input field on component load
  useEffect(() => {
    clientInputRef.current?.focus();
  }, []);

  const handleKeyDownNext = (
    e: React.KeyboardEvent, 
    nextRef: React.RefObject<HTMLInputElement | HTMLButtonElement | null>,
    selectOnFocus: boolean = false
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef.current) {
        nextRef.current.focus();
        if (selectOnFocus && 'select' in nextRef.current && typeof nextRef.current.select === 'function') {
          nextRef.current.select();
        }
      }
    }
  };

  const handleDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitBtnRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      setNotification({ type: 'error', message: 'Por favor complete el nombre del cliente.' });
      clientInputRef.current?.focus();
      return;
    }

    const cleanRemisionNum = remisionNumero.trim();
    if (!cleanRemisionNum) {
      setNotification({ type: 'error', message: 'Por favor ingrese el número de remisión.' });
      remisionInputRef.current?.focus();
      return;
    }

    if (amount <= 0) {
      setNotification({ type: 'error', message: 'El monto de la remisión debe ser mayor a 0 ₲.' });
      amountInputRef.current?.focus();
      return;
    }

    // Register remission in system
    onAddInvoice({
      category,
      documentType: 'remision',
      remisionNumero: cleanRemisionNum,
      clientName: clientName.trim(),
      sucursal: '',
      caja: '',
      numero: cleanRemisionNum,
      amount: Number(amount),
      invoiceDate: remisionDate || systemDate,
      terms: 0, // Remisiones don't have terms/plazo
      paid: false,
    });

    setNotification({ 
      type: 'success', 
      message: `¡Venta de remisión N° ${cleanRemisionNum} para "${clientName.trim()}" guardada exitosamente en ${category === 'Facturas' ? 'Facturas General' : 'Otras Facturas'}!` 
    });

    // Reset fields for rapid continuous entry
    setClientName('');
    setRemisionNumero('');
    setAmount(0);
    setRemisionDate(systemDate);

    // Auto refocus client input
    setTimeout(() => {
      clientInputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Banner header styles */}
        <div className="bg-amber-500 p-5 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-950 text-amber-400 rounded-lg shadow-sm">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">Registrar Venta de Remisión</h2>
              <p className="text-xs font-semibold opacity-90">Cargue notas y ventas de remisión directamente al sistema</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 bg-slate-950/10 px-3 py-1 rounded-full text-xs font-bold text-slate-900 font-mono">
            <span>Remisión Rápida</span>
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
              <span className="font-semibold">{notification.message}</span>
            </div>
          )}

          {/* Form Selector for Category - compact dropdown with arrow */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="remision-category-select">
              Destino de Registro (Categoría)
            </label>
            <div className="relative max-w-md">
              <select
                id="remision-category-select"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as InvoiceCategory);
                  clientInputRef.current?.focus();
                }}
                className="w-full appearance-none pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
              >
                <option value="Facturas">Facturas</option>
                <option value="Otras">Otras Facturas</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-amber-600 dark:text-amber-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Nombre del Cliente */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="remision-client-name">
                Nombre del Cliente
              </label>
              <input
                id="remision-client-name"
                ref={clientInputRef}
                list="remision-clients-datalist"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                onKeyDown={(e) => handleKeyDownNext(e, remisionInputRef, true)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                placeholder="Ej. Comercial Don Juan"
                required
              />
              <datalist id="remision-clients-datalist">
                {clients.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            {/* 2. Número de Remisión */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="remision-number-input">
                Número de Remisión
              </label>
              <div className="relative">
                <input
                  id="remision-number-input"
                  ref={remisionInputRef}
                  type="text"
                  value={remisionNumero}
                  onChange={(e) => setRemisionNumero(e.target.value)}
                  onKeyDown={(e) => handleKeyDownNext(e, amountInputRef, true)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold text-base"
                  placeholder="Ej. 10543"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 3. Monto de la Remisión */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="remision-amount-input">
                Monto de Remisión (₲)
              </label>
              <input
                id="remision-amount-input"
                ref={amountInputRef}
                type="text"
                inputMode="numeric"
                value={amount ? amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setAmount(raw ? parseInt(raw, 10) : 0);
                }}
                onKeyDown={(e) => handleKeyDownNext(e, dateInputRef)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold text-base"
                placeholder="0"
                required
              />
            </div>

            {/* 4. Fecha de Remisión */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="remision-date-input">
                Fecha de Remisión
              </label>
              <input
                id="remision-date-input"
                ref={dateInputRef}
                type="date"
                value={remisionDate}
                onChange={(e) => setRemisionDate(e.target.value)}
                onKeyDown={handleDateKeyDown}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-sm"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              id="submit-register-remision-btn"
              ref={submitBtnRef}
              type="submit"
              className="w-full py-3 bg-slate-900 dark:bg-primary-gold hover:bg-slate-950 dark:hover:bg-primary-gold-dark text-white dark:text-slate-950 font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-4 focus:ring-amber-500/50"
            >
              <PlusCircle className="w-5 h-5" />
              Guardar Venta de Remisión
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
