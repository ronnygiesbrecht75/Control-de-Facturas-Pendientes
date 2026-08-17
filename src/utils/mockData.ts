/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Invoice, UserSettings } from '../types';

// Helper to format currency in Paraguayan Guaraníes (e.g., ₲ 2.675.000)
export function formatPYG(value: number): string {
  const parts = value.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `₲ ${parts[0]}`;
}

// Convert format from YYYY-MM-DD to DD/MM/YYYY for presentation
export function formatDateDMY(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

// Format invoice numbers in Paraguay style: "AAA-BBB-CCCCCCC"
export function formatInvoiceNumber(sucursal: string, caja: string, numero: string): string {
  const pad = (str: string, size: number) => {
    let s = str.trim();
    while (s.length < size) s = '0' + s;
    return s.substring(0, size);
  };
  return `${pad(sucursal || '001', 3)}-${pad(caja || '009', 3)}-${pad(numero || '1', 7)}`;
}

// Helper to calculate raw due date as Date object or YYYY-MM-DD string
export function calculateDueDateString(invoiceDateStr: string, termsDays: number): string {
  if (!invoiceDateStr) return '';
  const date = new Date(invoiceDateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return invoiceDateStr;
  date.setDate(date.getDate() + (termsDays || 0));
  
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to calculate status
export function getInvoiceStatus(
  invoice: Invoice,
  todayStr: string // "YYYY-MM-DD"
): 'A Vencer' | 'Vencido' | 'Pagado' {
  if (invoice.paid) {
    return 'Pagado';
  }
  
  const dueDateStr = calculateDueDateString(invoice.invoiceDate, invoice.terms);
  if (!dueDateStr) return 'A Vencer';
  
  // Date comparison
  const due = new Date(dueDateStr + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  
  if (due < today) {
    return 'Vencido';
  }
  return 'A Vencer';
}

// Computes difference in days between due date and current date
export function getDaysDifference(dueDateStr: string, todayStr: string): number {
  if (!dueDateStr || !todayStr) return 0;
  const due = new Date(dueDateStr + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Extrae el valor numérico de los últimos 7 dígitos del número de factura.
 * Ejemplo: "0007333" -> 7333 (Cooperativa Fernheim Ltda 0007333).
 */
export function getInvoiceLast7DigitsValue(numero?: string): number {
  if (!numero) return 0;
  const digitsOnly = String(numero).replace(/\D/g, '');
  if (!digitsOnly) return 0;
  const last7 = digitsOnly.length > 7 ? digitsOnly.slice(-7) : digitsOnly;
  const parsed = parseInt(last7, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Comparador de facturas por los últimos 7 dígitos del número de factura.
 */
export function compareInvoiceNumbers(
  a: { sucursal?: string; caja?: string; numero?: string },
  b: { sucursal?: string; caja?: string; numero?: string },
  ascending: boolean = true
): number {
  const numA = getInvoiceLast7DigitsValue(a.numero);
  const numB = getInvoiceLast7DigitsValue(b.numero);
  if (numA !== numB) {
    return ascending ? numA - numB : numB - numA;
  }
  const codeA = `${a.sucursal || ''}-${a.caja || ''}-${a.numero || ''}`;
  const codeB = `${b.sucursal || ''}-${b.caja || ''}-${b.numero || ''}`;
  const codeComp = codeA.localeCompare(codeB, undefined, { numeric: true });
  return ascending ? codeComp : -codeComp;
}

// Initial empty list for production environment
export const initialInvoices: Invoice[] = [];

export const defaultSettings: UserSettings = {
  darkMode: false,
  username: 'admin',
  passwordEnabled: false, // Initially disabled for instant easy access, customizable in Settings
  passwordHash: 'admin'
};
