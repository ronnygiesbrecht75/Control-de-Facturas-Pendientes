/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { List, RowComponentProps } from 'react-window';
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
  ChevronDown,
  FileText,
  Printer
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import EditInvoiceModal from './EditInvoiceModal';
import InvoiceDetailModal from './InvoiceDetailModal';
import DateInputWithEnter, { DateInputHandle } from './DateInputWithEnter';
import { generateInvoicesPDF } from '../utils/pdfExport';

export type DocumentTypeFilter = 'all' | 'facturas' | 'remisiones';

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

type FacturaRowProps = {
  items: Invoice[];
  systemDate: string;
  onTogglePaid: (id: string) => void;
  onView: (inv: Invoice) => void;
  onEdit?: (inv: Invoice) => void;
  onDelete: (inv: Invoice) => void;
};

const FacturaRow = ({
  index,
  style,
  items,
  systemDate,
  onTogglePaid,
  onView,
  onEdit,
  onDelete
}: RowComponentProps<FacturaRowProps>) => {
  const inv = items[index];
  const dueDateStr = calculateDueDateString(inv.invoiceDate, inv.terms);
  const status = getInvoiceStatus(inv, systemDate);
  const daysLeft = getDaysDifference(dueDateStr, systemDate);

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
    <div
      style={style}
      className={`flex items-center box-border min-w-[1050px] border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors duration-150 text-xs ${
        inv.paid ? 'opacity-80' : ''
      }`}
    >
      {/* Cliente */}
      <div className="py-1 px-3 flex-1 min-w-[170px] font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
        {inv.clientName}
      </div>

      {/* N° Factura / Remisión */}
      <div className="py-1 px-3 w-[150px] min-w-[150px] font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap tracking-wide text-xs">
        {inv.documentType === 'remision' ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-sans tracking-wider">
              REM
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              N° {inv.remisionNumero || inv.numero}
            </span>
          </div>
        ) : (
          formatInvoiceNumber(inv.sucursal, inv.caja, inv.numero)
        )}
      </div>

      {/* Monto Facturado */}
      <div className="py-1 px-3 w-[125px] min-w-[125px] text-right font-mono font-bold text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">
        {formatPYG(inv.amount)}
      </div>

      {/* F. Emisión */}
      <div className="py-1 px-2.5 w-[90px] min-w-[90px] text-center text-slate-500 font-mono text-[11px] whitespace-nowrap">
        {formatDateDMY(inv.invoiceDate)}
      </div>

      {/* Plazo */}
      <div className="py-1 px-2 w-[60px] min-w-[60px] text-center text-slate-500 font-medium text-xs whitespace-nowrap">
        {inv.documentType === 'remision' ? (
          <span className="text-[10px] text-slate-400 font-medium italic">Remisión</span>
        ) : inv.terms ? (
          `${inv.terms}d`
        ) : (
          '-'
        )}
      </div>

      {/* F. Vence */}
      <div className="py-1 px-2.5 w-[90px] min-w-[90px] text-center font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
        {formatDateDMY(dueDateStr)}
      </div>

      {/* Estado */}
      <div className="py-1 px-3 w-[130px] min-w-[130px] text-center whitespace-nowrap">
        {statusBadge}
      </div>

      {/* F. Pago & Método */}
      <div className="py-1 px-3 w-[120px] min-w-[120px] text-right whitespace-nowrap">
        {inv.paid && inv.paymentDate ? (
          <div className="leading-tight">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px] block">
              {formatDateDMY(inv.paymentDate)}
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono block truncate">
              {inv.paymentMethod || 'Efectivo'}
              {inv.paymentDetails?.bankName ? ` - ${inv.paymentDetails.bankName}` : ''}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 text-xs">-</span>
        )}
      </div>

      {/* ¿Pago? */}
      <div className="py-1 px-2 w-[55px] min-w-[55px] text-center">
        <input
          id={`toggle-paid-${inv.id}`}
          aria-label={`Marcar pagado a cliente ${inv.clientName}`}
          type="checkbox"
          checked={inv.paid}
          onChange={() => onTogglePaid(inv.id)}
          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer align-middle"
        />
      </div>

      {/* Acciones */}
      <div className="py-1 px-2.5 w-[95px] min-w-[95px] text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1">
          <button
            id={`view-btn-${inv.id}`}
            onClick={() => onView(inv)}
            className="p-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
            title="Ver Detalle y Pagos de Factura"
          >
            <Eye className="w-3.5 h-3.5 inline" />
          </button>

          <button
            id={`edit-btn-${inv.id}`}
            onClick={() => onEdit?.(inv)}
            className="p-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
            title="Editar Factura"
          >
            <Edit3 className="w-3.5 h-3.5 inline" />
          </button>

          <button
            id={`delete-btn-${inv.id}`}
            onClick={() => onDelete(inv)}
            className="p-1 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
            title="Eliminar Factura"
          >
            <Trash2 className="w-3.5 h-3.5 inline" />
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentTypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('num-asc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const dateFromRef = React.useRef<DateInputHandle>(null);
  const dateToRef = React.useRef<DateInputHandle>(null);
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null);

  // Reset page when search, filter, sort, or page size changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, docTypeFilter, sortBy, pageSize, startDate, endDate]);

  // Filter invoices for this specific tab category AND selected document type
  const categoryInvoices = invoices.filter((inv) => {
    if (inv.category !== category) return false;
    if (docTypeFilter === 'facturas') {
      return inv.documentType !== 'remision';
    }
    if (docTypeFilter === 'remisiones') {
      return inv.documentType === 'remision';
    }
    return true; // 'all': Facturas y Remisiones
  });

  // Compute stats for category invoices
  const totalInvoiced = categoryInvoices.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaid = categoryInvoices
    .filter((inv) => inv.paid)
    .reduce((acc, curr) => acc + (curr.paidAmount || curr.amount), 0);
  const totalPending = categoryInvoices
    .filter((inv) => !inv.paid)
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Filter by search query, date range & selected status
  const filteredInvoices = categoryInvoices.filter((inv) => {
    const isRemision = inv.documentType === 'remision';
    const formattedNum = isRemision 
      ? (inv.remisionNumero || inv.numero || '')
      : formatInvoiceNumber(inv.sucursal, inv.caja, inv.numero);

    const matchesSearch = 
      inv.clientName.toLowerCase().includes(search.toLowerCase()) ||
      formattedNum.toLowerCase().includes(search.toLowerCase()) ||
      (inv.remisionNumero && inv.remisionNumero.toLowerCase().includes(search.toLowerCase())) ||
      (inv.numero && inv.numero.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Filtro por Fecha Desde / Hasta (emisión)
    if (startDate && inv.invoiceDate < startDate) return false;
    if (endDate && inv.invoiceDate > endDate) return false;

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
    const docTypeLabel = 
      docTypeFilter === 'all' 
        ? 'Facturas y Remisiones' 
        : docTypeFilter === 'remisiones' 
          ? 'Solo Remisiones' 
          : 'Solo Facturas';

    generateInvoicesPDF(sortedInvoices, {
      title: `Planilla de ${docTypeLabel} - ${category}`,
      subtitle: `Listado correspondiente a ${category} (${docTypeLabel})`,
      categoryFilter: category,
      statusFilter: statusFilter,
      searchFilter: search,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      systemDate: systemDate,
      clients: clients,
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
        
        {/* Custom Header controls (Ultracompacto en una sola barra integrada) */}
        <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          
          {/* Buscador */}
          <div className="relative flex-1 min-w-[190px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              id={`search-input-${category}`}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente o factura..."
              className="w-full pl-8 pr-7 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-[11px] rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-100"
            />
            {search && (
              <button 
                onClick={() => setSearch('')} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Borrar búsqueda"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Controles de Filtros y Acciones */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Rango de Fechas: Solo Desde y Hasta con soporte para tecla Enter */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Desde:
              </span>
              <DateInputWithEnter
                ref={dateFromRef}
                id={`date-from-${category}`}
                value={startDate}
                onChange={setStartDate}
                onEnterNext={() => dateToRef.current?.focus()}
              />
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Hasta:
              </span>
              <DateInputWithEnter
                ref={dateToRef}
                id={`date-to-${category}`}
                value={endDate}
                onChange={setEndDate}
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  title="Quitar fechas"
                  className="p-0.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Selector de Ordenación */}
            <div className="relative">
              <select
                id={`sort-select-${category}`}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none pl-2 pr-7 py-1 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-bold rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs cursor-pointer"
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

            {/* Selector de Documentos (No aplica para Cristian) */}
            {category !== 'Cristian' && (
              <div className="relative">
                <select
                  id={`doc-type-filter-${category}`}
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value as DocumentTypeFilter)}
                  className="appearance-none pl-2 pr-6 py-1 bg-amber-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-amber-300 dark:border-amber-600/50 text-[11px] font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
                >
                  <option value="all">Facturas y Remisiones</option>
                  <option value="facturas">Solo Facturas</option>
                  <option value="remisiones">Solo Remisiones</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 text-amber-600 dark:text-amber-400">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            )}

            {/* Filtro de Estado */}
            <div className="relative">
              <select
                id={`status-filter-${category}`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="appearance-none pl-2 pr-6 py-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 text-[11px] font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
              >
                <option value="All">Todos los Estados</option>
                <option value="A Vencer">A Vencer</option>
                <option value="Vencido">Vencido</option>
                <option value="Pagado">Pagado</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 text-slate-500 dark:text-slate-400">
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>

            {/* Botón PDF */}
            <button
              type="button"
              id={`export-pdf-btn-${category}`}
              onClick={handleExportPDF}
              title="Descargar o imprimir reporte PDF con la búsqueda/filtros actuales"
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-3 h-3" />
              <span>Hacer PDF ({sortedInvoices.length})</span>
            </button>
          </div>

        </div>

        {/* Invoice table list virtualized with react-window */}
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
            <div className="min-w-[1050px]">
              {/* Header */}
              <div className="bg-slate-950 text-white select-none whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider flex items-center h-9">
                <div className="py-2 px-3 flex-1 min-w-[170px]">Cliente</div>
                <div className="py-2 px-3 w-[150px] min-w-[150px]">N° Factura / Remisión</div>
                <div className="py-2 px-3 w-[125px] min-w-[125px] text-right">Monto Facturado</div>
                <div className="py-2 px-2.5 w-[90px] min-w-[90px] text-center">F. Emisión</div>
                <div className="py-2 px-2 w-[60px] min-w-[60px] text-center">Plazo</div>
                <div className="py-2 px-2.5 w-[90px] min-w-[90px] text-center">F. Vence</div>
                <div className="py-2 px-3 w-[130px] min-w-[130px] text-center">Estado</div>
                <div className="py-2 px-3 w-[120px] min-w-[120px] text-right">F. Pago</div>
                <div className="py-2 px-2 w-[55px] min-w-[55px] text-center">¿Pago?</div>
                <div className="py-2 px-2.5 w-[95px] min-w-[95px] text-center">Acciones</div>
              </div>

              {/* Virtualized Rows via react-window */}
              <List
                rowCount={paginatedInvoices.length}
                rowHeight={46}
                style={{
                  height: Math.min(552, Math.max(92, paginatedInvoices.length * 46)),
                  width: '100%'
                }}
                rowComponent={FacturaRow}
                rowProps={{
                  items: paginatedInvoices,
                  systemDate: systemDate,
                  onTogglePaid: onTogglePaid,
                  onView: setInvoiceToView,
                  onEdit: setInvoiceToEdit,
                  onDelete: setInvoiceToDelete
                }}
              />
            </div>
          )}
        </div>

        {/* Pagination controls */}
        {filteredInvoices.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-700 dark:text-slate-300">Mostrar:</span>
              <select
                id={`page-size-select-${category}`}
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900 dark:text-white cursor-pointer shadow-xs"
              >
                <option value={25} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">25 por página</option>
                <option value={50} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">50 por página</option>
                <option value={100} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">100 por página</option>
                <option value={250} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">250 por página</option>
                <option value={500} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">500 por página</option>
                <option value={1000000} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">Todas (Virtualizado react-window)</option>
              </select>
              <span className="text-slate-500 dark:text-slate-400">
                {pageSize >= 1000000 
                  ? `(Todas las ${totalItems} facturas en vista virtualizada)`
                  : `(Mostrando ${Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-${Math.min(totalItems, currentPage * pageSize)} de {totalItems})`
                }
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
        clients={clients}
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
