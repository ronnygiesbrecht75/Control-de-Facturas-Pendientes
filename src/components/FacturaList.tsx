/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Invoice, InvoiceCategory, PaymentStatus, Client } from '../types';
import { 
  formatPYG, 
  formatDateDMY, 
  formatInvoiceNumber, 
  calculateDueDateString, 
  getInvoiceStatus,
  getDaysDifference,
  compareInvoiceNumbers
} from '../utils/mockData';
import { 
  Search, 
  Trash2, 
  Edit3,
  Eye,
  PlusSquare, 
  CheckCircle, 
  X, 
  Calendar, 
  DollarSign, 
  Coins, 
  TrendingUp, 
  CreditCard,
  ArrowUpDown,
  FileText,
  Printer
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import EditInvoiceModal from './EditInvoiceModal';
import InvoiceDetailModal from './InvoiceDetailModal';
import { generateInvoicesPDF } from '../utils/pdfExport';

type SortOption = 
  | 'num-asc' 
  | 'num-desc' 
  | 'date-desc' 
  | 'date-asc' 
  | 'client-asc' 
  | 'client-desc';

const sortOptions = [
  { value: 'num-asc', label: 'Número de factura Menor a Mayor', shortLabel: 'Nro Factura (Menor a Mayor)' },
  { value: 'num-desc', label: 'Número de factura Mayor a Menor', shortLabel: 'Nro Factura (Mayor a Menor)' },
  { value: 'date-desc', label: 'Fecha: Reciente a Antigua', shortLabel: 'Fecha (más reciente)' },
  { value: 'date-asc', label: 'Fecha: Antigua a Reciente', shortLabel: 'Fecha (más antigua)' },
  { value: 'client-asc', label: 'Cliente: A a Z', shortLabel: 'Cliente (A-Z)' },
  { value: 'client-desc', label: 'Cliente: Z a A', shortLabel: 'Cliente (Z-A)' },
] as const;

interface FacturaListProps {
  category: InvoiceCategory;
  invoices: Invoice[];
  onDeleteInvoice: (id: string) => void;
  onTogglePaid: (id: string) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  clients?: Client[];
  systemDate: string;
}

export default function FacturaList({ 
  category, 
  invoices, 
  onDeleteInvoice, 
  onTogglePaid, 
  onEditInvoice,
  clients = [],
  systemDate 
}: FacturaListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentStatus>('All');
  const [sortBy, setSortBy] = useState<SortOption>('num-asc');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null);

  // Reset page when search, filter, sort, or page size changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortBy, pageSize]);

  // Filter invoices for this specific tab category
  const categoryInvoices = invoices.filter((inv) => inv.category === category);

  // Compute stats for category invoices
  const totalInvoiced = categoryInvoices.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaid = categoryInvoices
    .filter((inv) => inv.paid)
    .reduce((acc, curr) => acc + (curr.paidAmount || curr.amount), 0);
  const totalPending = categoryInvoices
    .filter((inv) => !inv.paid)
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Filter by search query & selected status
  const filteredInvoices = categoryInvoices.filter((inv) => {
    const formattedNum = formatInvoiceNumber(inv.sucursal, inv.caja, inv.numero);
    const matchesSearch = 
      inv.clientName.toLowerCase().includes(search.toLowerCase()) ||
      formattedNum.includes(search);
    
    if (!matchesSearch) return false;
    if (statusFilter === 'All') return true;
    
    const computedStatus = getInvoiceStatus(inv, systemDate);
    return computedStatus === statusFilter;
  });

  // Sort invoices according to selection (usando los últimos 7 dígitos numéricos)
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
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

  const totalItems = sortedInvoices.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedInvoices = sortedInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExportPDF = () => {
    generateInvoicesPDF(sortedInvoices, {
      title: `Planilla de Facturas - ${category}`,
      subtitle: `Listado correspondiente a ${category}`,
      categoryFilter: category,
      statusFilter: statusFilter,
      searchFilter: search,
      systemDate: systemDate,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Category header scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Facturado */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Facturado</p>
              <h4 className="text-xl font-bold text-slate-950 dark:text-slate-100 font-mono mt-1">{formatPYG(totalInvoiced)}</h4>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Total Pagado */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Liquidado/Pagado</p>
              <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{formatPYG(totalPaid)}</h4>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Total Pendiente */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Pendiente (Cta. Cte.)</p>
              <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">{formatPYG(totalPending)}</h4>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-lg">
              <Coins className="w-5 h-5" />
            </div>
          </div>
        </div>

      </div>

      {/* Main filter list controls */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Custom Header controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex flex-col xl:flex-row gap-4 items-center justify-between">
          
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-1 max-w-2xl">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
              <input
                id={`search-input-${category}`}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente o factura..."
                className="w-full pl-10 pr-4 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-gold text-slate-800 dark:text-slate-100"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')} 
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  aria-label="Borrar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Selector de Ordenación (Diseño robusto que no se oculta ni se corta) */}
            <div className="relative flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Ordenar por:
              </span>
              <div className="relative flex-1 sm:flex-initial">
                <select
                  id={`sort-select-${category}`}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full sm:w-auto appearance-none pl-3 pr-9 py-1.5 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs cursor-pointer"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-amber-500">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick tab filter and PDF export */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex flex-wrap gap-1">
              {(['All', 'A Vencer', 'Vencido', 'Pagado'] as const).map((filter) => {
                const active = statusFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      active 
                        ? 'bg-slate-900 dark:bg-primary-gold text-white dark:text-slate-950 shadow-sm' 
                        : 'bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {filter === 'All' ? 'Todos los Estados' : filter}
                  </button>
                );
              })}
            </div>

            {/* PDF Export Button */}
            <button
              type="button"
              id={`export-pdf-btn-${category}`}
              onClick={handleExportPDF}
              title="Descargar o imprimir reporte PDF con la búsqueda/filtros actuales"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Hacer PDF ({sortedInvoices.length})</span>
            </button>
          </div>

        </div>

        {/* Invoice table list */}
        <div className="overflow-x-auto">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <PlusSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                No se encontraron facturas registradas.
              </p>
              <p className="text-xs text-slate-400">
                Suba una nueva o verifique los filtros de búsqueda aplicados.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-white select-none whitespace-nowrap text-[11px]">
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider">Cliente</th>
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider whitespace-nowrap min-w-[145px]">N° de Factura</th>
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider text-right whitespace-nowrap">Monto Facturado</th>
                  <th className="py-2 px-2.5 font-semibold uppercase tracking-wider text-center whitespace-nowrap">F. Factura</th>
                  <th className="py-2 px-2 font-semibold uppercase tracking-wider text-center whitespace-nowrap">Plazo</th>
                  <th className="py-2 px-2.5 font-semibold uppercase tracking-wider text-center whitespace-nowrap">F. Vence</th>
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider text-center min-w-[130px] whitespace-nowrap">Estado</th>
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider text-right whitespace-nowrap">F. Pago</th>
                  <th className="py-2 px-2 font-semibold uppercase tracking-wider text-center whitespace-nowrap">¿Pago?</th>
                  <th className="py-2 px-2.5 font-semibold uppercase tracking-wider text-center whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {paginatedInvoices.map((inv) => {
                  const dueDateStr = calculateDueDateString(inv.invoiceDate, inv.terms);
                  const status = getInvoiceStatus(inv, systemDate);
                  const daysLeft = getDaysDifference(dueDateStr, systemDate);

                  // Set status style
                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 whitespace-nowrap">
                      A Vencer {daysLeft > 0 ? `(${daysLeft}d)` : '(Hoy)'}
                    </span>
                  );
                  if (status === 'Pagado') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 whitespace-nowrap">
                        Pagado
                      </span>
                    );
                  } else if (status === 'Vencido') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 whitespace-nowrap">
                        Vencido ({Math.abs(daysLeft)}d)
                      </span>
                    );
                  }

                  return (
                    <tr 
                      key={inv.id} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors duration-150 ${
                        inv.paid ? 'opacity-80' : ''
                      }`}
                    >
                      {/* Cliente */}
                      <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                        {inv.clientName}
                      </td>

                      {/* Nro Factura (1 Sola Línea con espacio suficiente) */}
                      <td className="py-1.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap tracking-wide text-xs">
                        {formatInvoiceNumber(inv.sucursal, inv.caja, inv.numero)}
                      </td>

                      {/* Monto Facturado */}
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">
                        {formatPYG(inv.amount)}
                      </td>

                      {/* Fecha de factura */}
                      <td className="py-1.5 px-2.5 text-center text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formatDateDMY(inv.invoiceDate)}
                      </td>

                      {/* Plazo término */}
                      <td className="py-1.5 px-2 text-center text-slate-500 font-medium text-xs whitespace-nowrap">
                        {inv.terms ? `${inv.terms}d` : '-'}
                      </td>

                      {/* Fecha de Vto */}
                      <td className="py-1.5 px-2.5 text-center font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatDateDMY(dueDateStr)}
                      </td>

                      {/* Estado (Ancho y sin partir) */}
                      <td className="py-1.5 px-3 text-center whitespace-nowrap">
                        {statusBadge}
                      </td>

                      {/* Fecha de Pago & Método */}
                      <td className="py-1.5 px-3 text-right whitespace-nowrap">
                        {inv.paid && inv.paymentDate ? (
                          <div className="leading-tight">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px] block">
                              {formatDateDMY(inv.paymentDate)}
                            </span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono block">
                              {inv.paymentMethod || 'Efectivo'}
                              {inv.paymentDetails?.bankName ? ` - ${inv.paymentDetails.bankName}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Checkbox selector */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          id={`toggle-paid-${inv.id}`}
                          aria-label={`Marcar pagado a cliente ${inv.clientName}`}
                          type="checkbox"
                          checked={inv.paid}
                          onChange={() => onTogglePaid(inv.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer align-middle"
                        />
                      </td>

                      {/* Action buttons */}
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            id={`view-btn-${inv.id}`}
                            onClick={() => setInvoiceToView(inv)}
                            className="p-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                            title="Ver Detalle y Pagos de Factura"
                          >
                            <Eye className="w-3.5 h-3.5 inline" />
                          </button>

                          <button
                            id={`edit-btn-${inv.id}`}
                            onClick={() => setInvoiceToEdit(inv)}
                            className="p-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                            title="Editar Factura"
                          >
                            <Edit3 className="w-3.5 h-3.5 inline" />
                          </button>

                          <button
                            id={`delete-btn-${inv.id}`}
                            onClick={() => setInvoiceToDelete(inv)}
                            className="p-1 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
                            title="Eliminar Factura"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination controls */}
        {filteredInvoices.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span>Mostrar:</span>
              <select
                id={`page-size-select-${category}`}
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold text-slate-800 dark:text-slate-250 cursor-pointer"
              >
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
              <span className="text-slate-500 dark:text-slate-400">
                (Mostrando {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-{Math.min(totalItems, currentPage * pageSize)} de {totalItems})
              </span>
            </div>

            {/* Page Navigation Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  id={`prev-page-btn-${category}`}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-all cursor-pointer ${
                    currentPage === 1
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'
                      : 'bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (totalPages > 7) {
                    if (page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 1) {
                      if (page === 2 && currentPage > 3) return <span key="dots-start" className="px-1 text-slate-400">...</span>;
                      if (page === totalPages - 1 && currentPage < totalPages - 2) return <span key="dots-end" className="px-1 text-slate-400">...</span>;
                      return null;
                    }
                  }
                  
                  const isCurrent = page === currentPage;
                  return (
                    <button
                      key={page}
                      id={`page-btn-${category}-${page}`}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-md border text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-950 dark:bg-primary-gold text-white dark:text-slate-950 border-slate-950 dark:border-primary-gold'
                          : 'bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  id={`next-page-btn-${category}`}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-all cursor-pointer ${
                    currentPage === totalPages
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'
                      : 'bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}

        {/* Global Summary list block for bottom */}
        {filteredInvoices.length > 0 && (
          <div className="bg-slate-950 text-white border-t border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 font-mono select-none">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Totales de la Categoría ({category})
            </span>
            <div className="flex flex-wrap gap-6 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-400">
                Facturado: {formatPYG(filteredInvoices.reduce((acc, curr) => acc + curr.amount, 0))}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                Liquidado: {formatPYG(filteredInvoices.filter(i => i.paid).reduce((acc, curr) => acc + (curr.paidAmount || curr.amount), 0))}
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                Pendiente: {formatPYG(filteredInvoices.filter(i => !i.paid).reduce((acc, curr) => acc + curr.amount, 0))}
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

      {/* Edit Invoice Modal */}
      <EditInvoiceModal
        isOpen={!!invoiceToEdit}
        invoice={invoiceToEdit}
        clients={clients}
        onSave={(updatedInvoice) => {
          if (onEditInvoice) {
            onEditInvoice(updatedInvoice);
          }
          setInvoiceToEdit(null);
        }}
        onClose={() => setInvoiceToEdit(null)}
      />

      {/* Confirmation Modal for deleting an invoice */}
      <ConfirmModal
        isOpen={!!invoiceToDelete}
        title="¿Eliminar Factura?"
        message={
          invoiceToDelete
            ? `¿Está seguro de que desea eliminar la factura ${formatInvoiceNumber(invoiceToDelete.sucursal, invoiceToDelete.caja, invoiceToDelete.numero)} de "${invoiceToDelete.clientName}" por valor de ${formatPYG(invoiceToDelete.amount)}? esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Sí, Eliminar Factura"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (invoiceToDelete) {
            onDeleteInvoice(invoiceToDelete.id);
            setInvoiceToDelete(null);
          }
        }}
        onClose={() => setInvoiceToDelete(null)}
      />

    </div>
  );
}
