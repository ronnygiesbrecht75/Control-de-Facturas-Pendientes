/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Invoice } from '../types';
import { 
  formatPYG, 
  formatDateDMY, 
  formatInvoiceNumber, 
  calculateDueDateString, 
  getInvoiceStatus,
  getDaysDifference 
} from '../utils/mockData';
import { 
  X, 
  Eye, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Building2, 
  Printer, 
  User, 
  Smartphone, 
  Layers, 
  Receipt,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { generateSingleInvoiceReceiptPDF } from '../utils/pdfExport';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  systemDate: string;
  onClose: () => void;
}

export default function InvoiceDetailModal({
  isOpen,
  invoice,
  systemDate,
  onClose
}: InvoiceDetailModalProps) {
  if (!isOpen || !invoice) return null;

  const formattedNumber = formatInvoiceNumber(invoice.sucursal, invoice.caja, invoice.numero);
  const dueDateStr = calculateDueDateString(invoice.invoiceDate, invoice.terms);
  const status = getInvoiceStatus(invoice, systemDate);
  const daysDiff = getDaysDifference(dueDateStr, systemDate);

  const isPaid = !!invoice.paid;
  const paidAmount = invoice.paidAmount ?? (isPaid ? invoice.amount : 0);
  const balanceRemaining = Math.max(0, invoice.amount - paidAmount);

  // Status visual badge
  let statusBadge = (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
      <Clock className="w-3.5 h-3.5 text-amber-600" />
      A Vencer {daysDiff > 0 ? `(${daysDiff} días restantes)` : '(¡Vence Hoy!)'}
    </span>
  );

  if (status === 'Pagado') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Pagado / Saldado
      </span>
    );
  } else if (status === 'Vencido') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        Vencido (hace {Math.abs(daysDiff)} días)
      </span>
    );
  }

  // Category visual badge
  const categoryBadge = (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
      invoice.category === 'Facturas'
        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
        : invoice.category === 'Cristian'
        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
        : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
    }`}>
      <Layers className="w-3 h-3" />
      {invoice.category === 'Facturas' ? 'Facturas Generales' : invoice.category === 'Cristian' ? 'Cristian' : 'Otras Facturas'}
    </span>
  );

  const handleDownloadPDF = () => {
    generateSingleInvoiceReceiptPDF(invoice, systemDate);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden my-6 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-display tracking-tight text-white">
                  Revisión Completa de Factura
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                N° {formattedNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              type="button"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title="Descargar Comprobante PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              id="close-invoice-detail-modal"
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Top Status & Category Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Categoría:</span>
              {categoryBadge}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Estado:</span>
              {statusBadge}
            </div>
          </div>

          {/* FINANCIAL SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Monto Total */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Monto Facturado
              </p>
              <p className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {formatPYG(invoice.amount)}
              </p>
            </div>

            {/* Monto Pagado */}
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Monto Cobrado / Pagado
              </p>
              <p className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatPYG(isPaid ? paidAmount : 0)}
              </p>
            </div>

            {/* Saldo Restante */}
            <div className={`p-3.5 rounded-xl border ${
              balanceRemaining > 0 
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
            }`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${
                balanceRemaining > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'
              }`}>
                Saldo Pendiente
              </p>
              <p className={`text-lg sm:text-xl font-bold font-mono mt-1 ${
                balanceRemaining > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
              }`}>
                {formatPYG(isPaid ? balanceRemaining : invoice.amount)}
              </p>
            </div>
          </div>

          {/* SECTION 1: DETALLES DE LA FACTURA */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-1.5">
              <FileText className="w-4 h-4 text-amber-500" />
              Datos de la Factura
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              
              {/* Cliente */}
              <div className="sm:col-span-2 flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Nombre del Cliente</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {invoice.clientName}
                  </span>
                </div>
              </div>

              {/* Número Completo */}
              <div>
                <span className="text-slate-400 text-[11px] block">N° de Factura Completo</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {formattedNumber}
                </span>
              </div>

              {/* Fecha Emisión */}
              <div>
                <span className="text-slate-400 text-[11px] block">Fecha de Emisión</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {formatDateDMY(invoice.invoiceDate)}
                </span>
              </div>

              {/* Plazo / Condición */}
              <div>
                <span className="text-slate-400 text-[11px] block">Condición / Plazo</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                  {invoice.terms && invoice.terms > 0 ? `${invoice.terms} días de crédito` : 'Contado'}
                </span>
              </div>

              {/* Fecha Vencimiento */}
              <div>
                <span className="text-slate-400 text-[11px] block">Fecha de Vencimiento</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {formatDateDMY(dueDateStr)}
                </span>
              </div>

            </div>
          </div>

          {/* SECTION 2: INFORMACIÓN DEL PAGO / COBRO */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-1.5">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Información del Pago
            </h4>

            {isPaid ? (
              <div className="bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-4 text-xs">
                
                {/* Header info */}
                <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60 dark:border-emerald-800/40">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">
                      Pago Registrado y Confirmado
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    {formatPYG(paidAmount)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fecha de Pago */}
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Fecha del Pago</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {formatDateDMY(invoice.paymentDate || invoice.invoiceDate)}
                    </span>
                  </div>

                  {/* Método de Pago */}
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Método de Pago</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      {invoice.paymentMethod || invoice.paymentDetails?.paymentMethod || 'Efectivo'}
                    </span>
                  </div>

                  {/* Transferencia: Banco */}
                  {invoice.paymentDetails?.bankName && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Banco de Origen / Destino</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {invoice.paymentDetails.bankName}
                      </span>
                    </div>
                  )}

                  {/* Transferencia: N° Comprobante */}
                  {invoice.paymentDetails?.transferReceipt && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block">N° de Comprobante / Referencia</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {invoice.paymentDetails.transferReceipt}
                      </span>
                    </div>
                  )}

                  {/* Cheque: N° de Cheque */}
                  {invoice.paymentDetails?.checkNumber && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Número de Cheque</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {invoice.paymentDetails.checkNumber}
                      </span>
                    </div>
                  )}

                  {/* Cheque: Fecha de Emisión */}
                  {invoice.paymentDetails?.checkIssueDate && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Fecha de Emisión del Cheque</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-slate-100 text-xs">
                        {formatDateDMY(invoice.paymentDetails.checkIssueDate)}
                      </span>
                    </div>
                  )}

                  {/* Cheque: Fecha de Depósito / Cobro */}
                  {invoice.paymentDetails?.checkDepositDate && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Fecha de Cobro / Depósito</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                        {formatDateDMY(invoice.paymentDetails.checkDepositDate)}
                      </span>
                    </div>
                  )}

                  {/* Registrado por */}
                  {invoice.paymentDetails?.registeredBy && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Cobrado / Registrado por</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                        {invoice.paymentDetails.registeredBy}
                      </span>
                    </div>
                  )}

                  {/* Fecha exacta de registro */}
                  {invoice.paymentDetails?.registeredAt && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Hora y Fecha de Registro</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                        {new Date(invoice.paymentDetails.registeredAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Factura pendiente de pago
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Esta factura no tiene registrado ningún pago en el sistema. Puedes registrar su cobro en cualquier momento desde la sección <strong>"Registrar Pagos"</strong> o <strong>"Cobro Repartidor"</strong>.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 dark:bg-slate-900/80 p-4 px-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <button
            onClick={handleDownloadPDF}
            type="button"
            className="flex sm:hidden items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>PDF / Imprimir</span>
          </button>

          <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-mono">
            Comercial Walter — Sistema Control de Pagos
          </div>

          <button
            id="btn-close-invoice-modal"
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer ml-auto"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
