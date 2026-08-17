/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceCategory, PaymentMethod, PaymentDetails } from '../types';
import { formatPYG, formatInvoiceNumber, formatDateDMY, compareInvoiceNumbers } from '../utils/mockData';
import { Search, CreditCard, CheckCircle2, AlertCircle, RefreshCw, Layers, ArrowUpDown, Banknote, Building2, FileCheck, Calendar, Eye } from 'lucide-react';
import InvoiceDetailModal from './InvoiceDetailModal';

type SortOption = 
  | 'num-asc' 
  | 'num-desc' 
  | 'date-desc' 
  | 'date-asc' 
  | 'client-asc' 
  | 'client-desc';

const sortOptions = [
  { value: 'num-asc', label: 'Número de factura Menor a Mayor' },
  { value: 'num-desc', label: 'Número de factura Mayor a Menor' },
  { value: 'date-desc', label: 'Fecha: Reciente a Antigua' },
  { value: 'date-asc', label: 'Fecha: Antigua a Reciente' },
  { value: 'client-asc', label: 'Cliente: A a Z' },
  { value: 'client-desc', label: 'Cliente: Z a A' },
] as const;

interface RegistrarPagosProps {
  invoices: Invoice[];
  onUpdatePayment: (
    id: string, 
    paidState: boolean, 
    amount?: number, 
    date?: string,
    details?: PaymentDetails
  ) => void;
  systemDate: string;
}

export default function RegistrarPagos({ invoices, onUpdatePayment, systemDate }: RegistrarPagosProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | InvoiceCategory>('All');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('num-asc');

  // Form states for active editing pane
  const [formPaid, setFormPaid] = useState(false);
  const [formPaidAmount, setFormPaidAmount] = useState<number>(0);
  const [formPaymentDate, setFormPaymentDate] = useState(systemDate);
  const [formMethod, setFormMethod] = useState<PaymentMethod>('Efectivo');
  const [formBank, setFormBank] = useState('');
  const [formTransferReceipt, setFormTransferReceipt] = useState('');
  const [formCheckNum, setFormCheckNum] = useState('');
  const [formCheckIssueDate, setFormCheckIssueDate] = useState(systemDate);
  const [formCheckDepositDate, setFormCheckDepositDate] = useState(systemDate);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null);

  // Load selected invoice into form
  useEffect(() => {
    if (selectedInvoice) {
      setFormPaid(selectedInvoice.paid);
      setFormPaidAmount(selectedInvoice.paidAmount || selectedInvoice.amount);
      setFormPaymentDate(selectedInvoice.paymentDate || systemDate);
      
      const det = selectedInvoice.paymentDetails;
      if (det) {
        setFormMethod(det.paymentMethod || 'Efectivo');
        setFormBank(det.bankName || '');
        setFormTransferReceipt(det.transferReceipt || '');
        setFormCheckNum(det.checkNumber || '');
        setFormCheckIssueDate(det.checkIssueDate || systemDate);
        setFormCheckDepositDate(det.checkDepositDate || systemDate);
      } else {
        setFormMethod(selectedInvoice.paymentMethod || 'Efectivo');
        setFormBank('');
        setFormTransferReceipt('');
        setFormCheckNum('');
        setFormCheckIssueDate(systemDate);
        setFormCheckDepositDate(systemDate);
      }
    }
  }, [selectedInvoice, systemDate]);

  // Keep selected invoice reference fresh with any database updates
  useEffect(() => {
    if (selectedInvoice) {
      const refreshed = invoices.find(i => i.id === selectedInvoice.id);
      if (refreshed) {
        setSelectedInvoice(refreshed);
      }
    }
  }, [invoices]);

  // Filter invoices based on search & category
  const filtered = invoices.filter((inv) => {
    const formattedNum = formatInvoiceNumber(inv.sucursal, inv.caja, inv.numero);
    const matchesSearch =
      inv.clientName.toLowerCase().includes(search.toLowerCase()) ||
      formattedNum.includes(search);
    
    const matchesCategory = selectedCategory === 'All' || inv.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Sort invoices according to selection (usando los últimos 7 dígitos numéricos)
  const sortedFiltered = [...filtered].sort((a, b) => {
    if (sortBy === 'num-asc') {
      return compareInvoiceNumbers(a, b, true);
    }
    if (sortBy === 'num-desc') {
      return compareInvoiceNumbers(a, b, false);
    }
    if (sortBy === 'client-asc') {
      return a.clientName.localeCompare(b.clientName, 'es', { sensitivity: 'base' });
    }
    if (sortBy === 'client-desc') {
      return b.clientName.localeCompare(a.clientName, 'es', { sensitivity: 'base' });
    }
    if (sortBy === 'date-asc') {
      return new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
    }
    if (sortBy === 'date-desc') {
      return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
    }
    return 0;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const details: PaymentDetails | undefined = formPaid ? {
      paymentDate: formPaymentDate,
      paymentMethod: formMethod,
      amount: formPaidAmount,
      bankName: formBank || undefined,
      transferReceipt: formTransferReceipt || undefined,
      checkNumber: formCheckNum || undefined,
      checkIssueDate: formCheckIssueDate || undefined,
      checkDepositDate: formCheckDepositDate || undefined,
      registeredBy: selectedInvoice.paymentDetails?.registeredBy || 'Administración PC'
    } : undefined;

    onUpdatePayment(
      selectedInvoice.id,
      formPaid,
      formPaid ? formPaidAmount : undefined,
      formPaid ? formPaymentDate : undefined,
      details
    );

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      
      {/* Left Col: Invoice list selector - 7 units */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">
            Gestión y Control de Cobranzas
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Seleccione una factura de la lista para registrar o editar su estado de pago.
          </p>

          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="payment-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente, número de factura..."
                className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-gold"
              />
            </div>

            {/* Category selection and Sort selection */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-1 flex-wrap">
                {(['All', 'Facturas', 'Otras', 'Cristian'] as const).map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-900 dark:bg-primary-gold text-white dark:text-slate-950'
                          : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat === 'All' ? 'Todas' : cat}
                    </button>
                  );
                })}
              </div>

              {/* Selector de Ordenación (Diseño robusto) */}
              <div className="relative flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Ordenar:
                </span>
                <div className="relative flex-1 sm:flex-initial">
                  <select
                    id="sort-select-pagos"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full sm:w-auto appearance-none pl-2.5 pr-8 py-1.5 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] font-bold rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs cursor-pointer"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-amber-500">
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* List representation */}
        <div className="overflow-y-auto max-h-[500px] divide-y divide-slate-100 dark:divide-slate-700/60">
          {sortedFiltered.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">
                No hay facturas que coincidan con la búsqueda.
              </p>
            </div>
          ) : (
            sortedFiltered.map((inv) => {
              const isSelected = selectedInvoice?.id === inv.id;
              
              return (
                <button
                  id={`select-pay-inv-${inv.id}`}
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors flex items-center justify-between gap-4 border-l-4 cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-100 dark:bg-slate-900/60 border-primary-gold' 
                      : inv.paid 
                        ? 'border-l-emerald-500' 
                        : 'border-l-slate-300 dark:border-l-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                        {inv.clientName}
                      </span>
                      <span className="bg-slate-100 dark:bg-slate-700 text-[9px] px-1.5 py-0.5 rounded font-mono text-slate-500 dark:text-slate-300">
                        {inv.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">
                      No. {formatInvoiceNumber(inv.sucursal, inv.caja, inv.numero)} • F. Factura: {formatDateDMY(inv.invoiceDate)}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatPYG(inv.amount)}
                    </p>
                    {inv.paid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Cobrada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        Pto. Cobro
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

      </div>

      {/* Right Col: Active Editing pane - 5 units */}
      <div className="lg:col-span-5 space-y-4">
        {selectedInvoice ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            
            <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 p-5 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-sm tracking-tight font-display">Registrar / Editar Pago</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Edición en tiempo real</p>
                </div>
              </div>
              <button
                id="view-selected-inv-btn"
                type="button"
                onClick={() => setInvoiceToView(selectedInvoice)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800/50"
                title="Ver factura completa y comprobante"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ver Factura</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-xs rounded-lg border border-emerald-200 transition-all font-medium">
                  ✓ Registro de pago actualizado correctamente.
                </div>
              )}

              {/* Readonly specs info */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-2 border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Cliente seleccionado:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{selectedInvoice.clientName}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400">Factura:</span>
                    <p className="font-mono font-medium">{formatInvoiceNumber(selectedInvoice.sucursal, selectedInvoice.caja, selectedInvoice.numero)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Monto Factura:</span>
                    <p className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatPYG(selectedInvoice.amount)}</p>
                  </div>
                </div>
              </div>

              {/* ¿Pagó? Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                  Estado de Liquidación
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFormPaid(false);
                    }}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-colors cursor-pointer ${
                      !formPaid
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    No Pagado / Pendiente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormPaid(true);
                    }}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-colors cursor-pointer ${
                      formPaid
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Sí, Liquidado/Cobrado
                  </button>
                </div>
              </div>

              {/* Conditionally show payment details */}
              {formPaid && (
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700 animate-fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="pane-paid-amount">
                      Monto de Pago
                    </label>
                    <input
                      id="pane-paid-amount"
                      type="number"
                      min={0}
                      value={formPaidAmount || ''}
                      onChange={(e) => setFormPaidAmount(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 font-medium">
                      Liquidando: {formatPYG(formPaidAmount)} Gs.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="pane-payment-date">
                      Fecha de Pago
                    </label>
                    <input
                      id="pane-payment-date"
                      type="date"
                      value={formPaymentDate}
                      onChange={(e) => setFormPaymentDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                      required
                    />
                  </div>

                  {/* Método de Pago */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Método de Pago
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['Efectivo', 'Transferencia', 'Cheque al día', 'Cheque diferido'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFormMethod(m)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer border ${
                            formMethod === m
                              ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transfer details */}
                  {formMethod === 'Transferencia' && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Banco</label>
                        <input
                          type="text"
                          value={formBank}
                          onChange={(e) => setFormBank(e.target.value)}
                          placeholder="Ej. Itaú, Continental..."
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Nº Comprobante</label>
                        <input
                          type="text"
                          value={formTransferReceipt}
                          onChange={(e) => setFormTransferReceipt(e.target.value)}
                          placeholder="Ej. TR-9982"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Check details */}
                  {(formMethod === 'Cheque al día' || formMethod === 'Cheque diferido') && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Nº de Cheque</label>
                        <input
                          type="text"
                          value={formCheckNum}
                          onChange={(e) => setFormCheckNum(e.target.value)}
                          placeholder="Ej. CH-88192"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Banco del Cheque</label>
                        <input
                          type="text"
                          value={formBank}
                          onChange={(e) => setFormBank(e.target.value)}
                          placeholder="Ej. Banco Familiar"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-700 text-xs"
                        />
                      </div>

                      {formMethod === 'Cheque diferido' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">F. Emisión</label>
                            <input
                              type="date"
                              value={formCheckIssueDate}
                              onChange={(e) => setFormCheckIssueDate(e.target.value)}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-700 text-[11px]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">F. Pago/Cobro</label>
                            <input
                              type="date"
                              value={formCheckDepositDate}
                              onChange={(e) => setFormCheckDepositDate(e.target.value)}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-amber-600 dark:text-amber-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                id="save-payment-btn"
                type="submit"
                className="w-full py-2.5 bg-slate-900 dark:bg-primary-gold hover:bg-slate-950 dark:hover:bg-primary-gold-dark text-white dark:text-slate-950 font-bold rounded-lg transition-colors cursor-pointer text-sm"
              >
                Aplicar y Guardar Cambios
              </button>

            </form>
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <RefreshCw className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 animate-spin-slow" />
            <p className="text-sm font-semibold">Selección de Pago Vacía</p>
            <p className="text-xs">
              Haga clic sobre cualquier factura de la columna izquierda para activar la edición de pagos e ingresar montos recibidos.
            </p>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={!!invoiceToView}
        invoice={invoiceToView}
        systemDate={systemDate}
        onClose={() => setInvoiceToView(null)}
      />

    </div>
  );
}
