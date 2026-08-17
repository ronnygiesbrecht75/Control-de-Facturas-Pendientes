/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceCategory, PaymentMethod, Client } from '../types';
import { formatPYG, formatInvoiceNumber } from '../utils/mockData';
import { Edit3, X, Save, Calendar, DollarSign, Building, FileText, CheckCircle2 } from 'lucide-react';

interface EditInvoiceModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  clients?: Client[];
  onSave: (updatedInvoice: Invoice) => void;
  onClose: () => void;
}

export default function EditInvoiceModal({
  isOpen,
  invoice,
  clients = [],
  onSave,
  onClose
}: EditInvoiceModalProps) {
  if (!isOpen || !invoice) return null;

  // Form states
  const [category, setCategory] = useState<InvoiceCategory>(invoice.category);
  const [clientName, setClientName] = useState(invoice.clientName);
  const [sucursal, setSucursal] = useState(invoice.sucursal);
  const [caja, setCaja] = useState(invoice.caja);
  const [numero, setNumero] = useState(invoice.numero);
  const [amount, setAmount] = useState<number>(invoice.amount);
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoiceDate);
  const [terms, setTerms] = useState<number>(invoice.terms || 0);

  // Paid state
  const [paid, setPaid] = useState<boolean>(invoice.paid);
  const [paidAmount, setPaidAmount] = useState<number>(invoice.paidAmount ?? invoice.amount);
  const [paymentDate, setPaymentDate] = useState<string>(invoice.paymentDate ?? invoice.invoiceDate);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(invoice.paymentMethod ?? 'Efectivo');

  // Details
  const [bankName, setBankName] = useState<string>(invoice.paymentDetails?.bankName ?? '');
  const [transferReceipt, setTransferReceipt] = useState<string>(invoice.paymentDetails?.transferReceipt ?? '');
  const [checkNumber, setCheckNumber] = useState<string>(invoice.paymentDetails?.checkNumber ?? '');
  const [checkDepositDate, setCheckDepositDate] = useState<string>(invoice.paymentDetails?.checkDepositDate ?? '');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Re-sync when invoice changes
  useEffect(() => {
    if (invoice) {
      setCategory(invoice.category);
      setClientName(invoice.clientName);
      setSucursal(invoice.sucursal);
      setCaja(invoice.caja);
      setNumero(invoice.numero);
      setAmount(invoice.amount);
      setInvoiceDate(invoice.invoiceDate);
      setTerms(invoice.terms || 0);
      setPaid(invoice.paid);
      setPaidAmount(invoice.paidAmount ?? invoice.amount);
      setPaymentDate(invoice.paymentDate ?? invoice.invoiceDate);
      setPaymentMethod(invoice.paymentMethod ?? 'Efectivo');
      setBankName(invoice.paymentDetails?.bankName ?? '');
      setTransferReceipt(invoice.paymentDetails?.transferReceipt ?? '');
      setCheckNumber(invoice.paymentDetails?.checkNumber ?? '');
      setCheckDepositDate(invoice.paymentDetails?.checkDepositDate ?? '');
      setErrorMsg(null);
    }
  }, [invoice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      setErrorMsg('Por favor, ingrese el nombre del cliente.');
      return;
    }

    if (!numero.trim()) {
      setErrorMsg('Por favor, ingrese el número de factura.');
      return;
    }

    if (amount <= 0) {
      setErrorMsg('El monto facturado debe ser mayor a cero.');
      return;
    }

    const cleanSucursal = sucursal.padStart(3, '0').substring(0, 3);
    const cleanCaja = caja.padStart(3, '0').substring(0, 3);
    const cleanNumero = numero.padStart(7, '0').substring(0, 7);

    const updatedInvoice: Invoice = {
      ...invoice,
      category,
      clientName: clientName.trim(),
      sucursal: cleanSucursal,
      caja: cleanCaja,
      numero: cleanNumero,
      amount,
      invoiceDate,
      terms: terms || 0,
      paid,
      ...(paid
        ? {
            paidAmount: paidAmount || amount,
            paymentDate,
            paymentMethod,
            paymentDetails: {
              paymentDate,
              paymentMethod,
              amount: paidAmount || amount,
              bankName: bankName.trim() || undefined,
              transferReceipt: transferReceipt.trim() || undefined,
              checkNumber: checkNumber.trim() || undefined,
              checkDepositDate: checkDepositDate || undefined,
              registeredBy: invoice.paymentDetails?.registeredBy || 'Edición Manual',
              registeredAt: invoice.paymentDetails?.registeredAt || new Date().toISOString()
            }
          }
        : {
            paidAmount: undefined,
            paymentDate: undefined,
            paymentMethod: undefined,
            paymentDetails: undefined
          })
    };

    onSave(updatedInvoice);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl my-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">
                Editar Factura
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {formatInvoiceNumber(invoice.sucursal, invoice.caja, invoice.numero)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Categoría */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pestaña / Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InvoiceCategory)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="Facturas">Facturas (General)</option>
                <option value="Otras">Otras Facturas</option>
                <option value="Cristian">Cristian</option>
              </select>
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nombre del Cliente
              </label>
              <input
                type="text"
                list="edit-clients-list"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre del cliente"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <datalist id="edit-clients-list">
                {clients.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Número de Factura (Sucursal - Caja - Número) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Número de Factura (Sucursal - Caja - Número)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={3}
                value={sucursal}
                onChange={(e) => setSucursal(e.target.value.replace(/\D/g, ''))}
                placeholder="001"
                className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="text"
                maxLength={3}
                value={caja}
                onChange={(e) => setCaja(e.target.value.replace(/\D/g, ''))}
                placeholder="009"
                className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="text"
                maxLength={7}
                value={numero}
                onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
                placeholder="0001234"
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Monto */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Monto Total (PYG)
              </label>
              <input
                type="number"
                min={1}
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Monto Guaraníes"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                {formatPYG(amount)}
              </span>
            </div>

            {/* Fecha de Emisión */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Emisión
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                required
              />
            </div>

            {/* Plazo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Plazo (Días)
              </label>
              <input
                type="number"
                min={0}
                value={terms}
                onChange={(e) => setTerms(Number(e.target.value))}
                placeholder="Días de crédito"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Estado de Pago */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-5 h-5 ${paid ? 'text-emerald-500' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    ¿Esta factura está PAGADA?
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {paid ? 'Cobro registrado' : 'Factura pendiente de cobro'}
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={paid}
                onChange={(e) => {
                  setPaid(e.target.checked);
                  if (e.target.checked && paidAmount === 0) {
                    setPaidAmount(amount);
                  }
                }}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Payment Details Section if paid */}
          {paid && (
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-3 animate-fade-in">
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider font-mono">
                Detalles del Pago
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Monto Cobrado
                  </label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Pago
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Cheque al día">Cheque al día</option>
                    <option value="Cheque diferido">Cheque diferido</option>
                  </select>
                </div>
              </div>

              {(paymentMethod === 'Transferencia' || paymentMethod.includes('Cheque')) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Banco
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Banco Itaú, Sudameris, Continental"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {paymentMethod === 'Transferencia' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nro. Comprobante
                      </label>
                      <input
                        type="text"
                        placeholder="Nro. de transferencia"
                        value={transferReceipt}
                        onChange={(e) => setTransferReceipt(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nro. Cheque
                      </label>
                      <input
                        type="text"
                        placeholder="Número de cheque"
                        value={checkNumber}
                        onChange={(e) => setCheckNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  )}

                  {paymentMethod === 'Cheque diferido' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Fecha Cobro Cheque Diferido
                      </label>
                      <input
                        type="date"
                        value={checkDepositDate}
                        onChange={(e) => setCheckDepositDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer text-slate-950 font-display"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
