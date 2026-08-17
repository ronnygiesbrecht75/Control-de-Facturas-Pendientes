/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Invoice, InvoiceCategory } from '../types';
import { 
  formatPYG, 
  getInvoiceStatus, 
  calculateDueDateString, 
  getDaysDifference,
  formatInvoiceNumber,
  formatDateDMY,
  compareInvoiceNumbers
} from '../utils/mockData';
import { 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  FileWarning, 
  ArrowUpDown, 
  Search, 
  X,
  Clock,
  Layers,
  FileText,
  Eye
} from 'lucide-react';
import { generateInvoicesPDF } from '../utils/pdfExport';
import InvoiceDetailModal from './InvoiceDetailModal';

type SortOption = 
  | 'num-asc' 
  | 'num-desc' 
  | 'date-desc' 
  | 'date-asc' 
  | 'client-asc' 
  | 'client-desc'
  | 'due-asc'
  | 'due-desc';

const sortOptions = [
  { value: 'num-asc', label: 'Número de factura Menor a Mayor' },
  { value: 'num-desc', label: 'Número de factura Mayor a Menor' },
  { value: 'date-desc', label: 'Fecha Emisión: Reciente a Antigua' },
  { value: 'date-asc', label: 'Fecha Emisión: Antigua a Reciente' },
  { value: 'due-asc', label: 'Vencimiento: Más Urgentes Primero' },
  { value: 'due-desc', label: 'Vencimiento: Más Lejanos Primero' },
  { value: 'client-asc', label: 'Cliente: A a Z' },
  { value: 'client-desc', label: 'Cliente: Z a A' },
] as const;

interface FacturasPendientesProps {
  invoices: Invoice[];
  systemDate: string;
}

export default function FacturasPendientes({ invoices, systemDate }: FacturasPendientesProps) {
  const [sortBy, setSortBy] = useState<SortOption>('num-asc');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | InvoiceCategory>('Todas');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Vencido' | 'A Vencer'>('Todos');
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null);

  // Filter for UNPAID invoices (all pending)
  const pendingInvoices = invoices.filter((inv) => !inv.paid);

  // Compute calculated status and totals across all unpaid invoices
  let totalAVencer = 0;
  let totalVencido = 0;
  let countAVencer = 0;
  let countVencido = 0;

  const allCalculatedItems = pendingInvoices.map((inv) => {
    const status = getInvoiceStatus(inv, systemDate);
    const dueDateStr = calculateDueDateString(inv.invoiceDate, inv.terms || 0);
    const daysDiff = getDaysDifference(dueDateStr, systemDate);

    if (status === 'Vencido') {
      totalVencido += inv.amount;
      countVencido += 1;
    } else {
      totalAVencer += inv.amount;
      countAVencer += 1;
    }

    return {
      ...inv,
      status,
      dueDateStr,
      daysDiff
    };
  });

  // Filter items by category, status, and search term
  const filteredItems = allCalculatedItems.filter((item) => {
    const matchesCategory = categoryFilter === 'Todas' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;
    const formattedNum = formatInvoiceNumber(item.sucursal, item.caja, item.numero);
    const matchesSearch = 
      item.clientName.toLowerCase().includes(search.toLowerCase()) ||
      formattedNum.includes(search) ||
      (item.numero && item.numero.includes(search));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Sorted items
  const sortedTableItems = [...filteredItems].sort((a, b) => {
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
    if (sortBy === 'due-asc') {
      return new Date(a.dueDateStr).getTime() - new Date(b.dueDateStr).getTime();
    }
    if (sortBy === 'due-desc') {
      return new Date(b.dueDateStr).getTime() - new Date(a.dueDateStr).getTime();
    }
    return 0;
  });

  const totalFilteredAmount = sortedTableItems.reduce((acc, curr) => acc + curr.amount, 0);

  const handleExportPDF = () => {
    generateInvoicesPDF(sortedTableItems, {
      title: 'Facturas Pendientes de Cobro',
      subtitle: 'Listado detallado de facturas a vencer y vencidas',
      categoryFilter: categoryFilter,
      statusFilter: statusFilter,
      searchFilter: search,
      systemDate: systemDate,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Cards (Arriba 2 recuadros de suma total con interacción para filtrar) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Recuadro 1: Suma Total a Vencer */}
        <button
          type="button"
          onClick={() => setStatusFilter(prev => prev === 'A Vencer' ? 'Todos' : 'A Vencer')}
          className={`text-left rounded-xl p-5 border-l-4 border-amber-500 shadow-sm flex items-center justify-between transition-all cursor-pointer ${
            statusFilter === 'A Vencer' 
              ? 'bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-500 shadow-md' 
              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Suma Total Facturas a Vencer
              </p>
              {statusFilter === 'A Vencer' && (
                <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full">
                  Filtrado
                </span>
              )}
            </div>
            <p className="text-2xl md:text-3xl font-bold text-slate-950 dark:text-slate-100 font-mono">
              {formatPYG(totalAVencer)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {countAVencer} factura(s) activa(s) en plazo o al día
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </button>

        {/* Recuadro 2: Suma Total Vencido */}
        <button
          type="button"
          onClick={() => setStatusFilter(prev => prev === 'Vencido' ? 'Todos' : 'Vencido')}
          className={`text-left rounded-xl p-5 border-l-4 border-rose-500 shadow-sm flex items-center justify-between transition-all cursor-pointer ${
            statusFilter === 'Vencido' 
              ? 'bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-500 shadow-md' 
              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                Suma Total Facturas Vencidas
              </p>
              {statusFilter === 'Vencido' && (
                <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full">
                  Filtrado
                </span>
              )}
            </div>
            <p className="text-2xl md:text-3xl font-bold text-rose-600 dark:text-rose-400 font-mono">
              {formatPYG(totalVencido)}
            </p>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium">
              {countVencido} factura(s) con retraso de pago
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </button>

      </div>

      {/* Control Bar: Categorías, Filtros de Estado y Buscador */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Selector de Categorías */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5" /> Categoría:
            </span>
            {(['Todas', 'Facturas', 'Cristian', 'Otras'] as const).map((cat) => {
              const isSelected = categoryFilter === cat;
              const countInCat = cat === 'Todas' 
                ? pendingInvoices.length 
                : pendingInvoices.filter(i => i.category === cat).length;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected 
                      ? 'bg-white/20 text-white dark:text-slate-950' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {countInCat}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtro de Estado (Todos / Vencidos / A Vencer) y Botón PDF */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setStatusFilter('Todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'Todos'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Todos ({allCalculatedItems.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Vencido')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'Vencido'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                }`}
              >
                <FileWarning className="w-3.5 h-3.5" />
                Solo Vencidos ({countVencido})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('A Vencer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'A Vencer'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                A Vencer ({countAVencer})
              </button>
            </div>

            <button
              type="button"
              id="export-pdf-btn-pendientes"
              onClick={handleExportPDF}
              title="Descargar o imprimir reporte PDF según la búsqueda y categoría actual"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Hacer PDF ({sortedTableItems.length})</span>
            </button>
          </div>

        </div>

        {/* Buscador & Ordenación */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente o número..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Ordenar por:
            </span>
            <div className="relative">
              <select
                id="sort-select-pendientes"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-500" />
            </div>

            <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs px-2.5 py-1.5 rounded-lg font-bold border border-amber-200 dark:border-amber-800">
              {sortedTableItems.length} facturas
            </span>
          </div>
        </div>
      </div>

      {/* Main Table section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        <div className="overflow-x-auto">
          {sortedTableItems.length === 0 ? (
            <div className="text-center py-14 px-4 space-y-3">
              <CheckCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {search || statusFilter !== 'Todos' || categoryFilter !== 'Todas'
                  ? 'No se encontraron facturas con los filtros seleccionados.'
                  : '¡No hay facturas pendientes de cobro! Todas las cuentas están saldadas.'}
              </p>
              {(search || statusFilter !== 'Todos' || categoryFilter !== 'Todas') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('Todos');
                    setCategoryFilter('Todas');
                  }}
                  className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-white select-none border-b border-slate-800 text-[11px] whitespace-nowrap">
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider">Cliente</th>
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider whitespace-nowrap min-w-[145px]">N° de Factura</th>
                  <th className="py-2 px-2.5 font-semibold uppercase tracking-wider whitespace-nowrap">Categoría</th>
                  <th className="py-2 px-2.5 font-semibold uppercase tracking-wider whitespace-nowrap">Emisión</th>
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider text-right whitespace-nowrap">Monto Facturado</th>
                  <th className="py-2 px-2 font-semibold uppercase tracking-wider text-center whitespace-nowrap">Plazo</th>
                  <th className="py-2 px-2.5 font-semibold uppercase tracking-wider text-center whitespace-nowrap">Vencimiento</th>
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider text-right font-bold whitespace-nowrap min-w-[140px]">Estado / Días</th>
                  <th className="py-2 px-2.5 font-semibold uppercase tracking-wider text-center whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {sortedTableItems.map((item) => {
                  const isOverdue = item.status === 'Vencido';
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors duration-150 ${
                        isOverdue 
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      {/* Cliente */}
                      <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                        {item.clientName}
                      </td>

                      {/* N° Factura (1 Sola Línea sin partir) */}
                      <td className="py-1.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap tracking-wide text-xs">
                        {formatInvoiceNumber(item.sucursal, item.caja, item.numero)}
                      </td>

                      {/* Categoría */}
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.category === 'Facturas'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : item.category === 'Cristian'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                        }`}>
                          {item.category}
                        </span>
                      </td>

                      {/* Fecha Emisión */}
                      <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {formatDateDMY(item.invoiceDate)}
                      </td>

                      {/* Monto */}
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-950 dark:text-slate-50 text-xs whitespace-nowrap">
                        {formatPYG(item.amount)}
                      </td>

                      {/* Término */}
                      <td className="py-1.5 px-2 text-center font-medium text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                        {item.terms && item.terms > 0 ? `${item.terms}d` : 'Contado'}
                      </td>

                      {/* Vencimiento */}
                      <td className="py-1.5 px-2.5 text-center font-mono font-medium text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatDateDMY(item.dueDateStr)}
                      </td>

                      {/* Estado / Días (Ancho y sin partir) */}
                      <td className="py-1.5 px-3 text-right whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-mono whitespace-nowrap">
                            <FileWarning className="w-3 h-3 text-rose-600" />
                            Vencido ({Math.abs(item.daysDiff)}d)
                          </span>
                        ) : item.daysDiff === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-mono whitespace-nowrap">
                            <Clock className="w-3 h-3 text-amber-600" />
                            ¡Vence Hoy!
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono whitespace-nowrap">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            Faltan {item.daysDiff}d
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                        <button
                          id={`view-pending-btn-${item.id}`}
                          onClick={() => setInvoiceToView(item)}
                          className="p-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                          title="Ver Detalle de Factura"
                        >
                          <Eye className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals Table Footer */}
        {sortedTableItems.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex flex-col md:flex-row items-center justify-between text-slate-600 dark:text-slate-400 gap-3">
            <span className="text-xs">
              Monto total mostrado ({sortedTableItems.length} facturas):{' '}
              <strong className="text-slate-950 dark:text-slate-100 font-mono font-bold text-sm">
                {formatPYG(totalFilteredAmount)}
              </strong>
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                A Vencer: <strong className="text-slate-900 dark:text-slate-100 font-mono">{formatPYG(sortedTableItems.filter(i => i.status === 'A Vencer').reduce((acc, curr) => acc + curr.amount, 0))}</strong>
              </span>
              <span className="text-xs flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                Vencido: <strong className="text-rose-600 dark:text-rose-400 font-mono">{formatPYG(sortedTableItems.filter(i => i.status === 'Vencido').reduce((acc, curr) => acc + curr.amount, 0))}</strong>
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Invoice Detail & Review Modal */}
      <InvoiceDetailModal
        isOpen={!!invoiceToView}
        invoice={invoiceToView}
        systemDate={systemDate}
        onClose={() => setInvoiceToView(null)}
      />

    </div>
  );
}

