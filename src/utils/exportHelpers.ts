/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Invoice } from '../types';
import { formatDateDMY, formatInvoiceNumber, calculateDueDateString, getInvoiceStatus } from './mockData';

// Generate Spanish CSV content for Excel
export function generateInvoicesCSVContent(
  invoices: Invoice[],
  todayStr: string
): string {
  // Column definitions matching user's requests and complete payment details
  const headers = [
    'Cliente',
    'Nro Documento',
    'Tipo Documento',
    'Monto Facturado (PYG)',
    'Fecha Emisión',
    'Término (Días)',
    'Fecha Vencimiento',
    'Estado',
    '¿Cobrado?',
    'Monto Cobrado (PYG)',
    'Fecha Cobro',
    'Método de Pago',
    'Detalle Comprobante'
  ];

  const rows = invoices.map(inv => {
    const dueDate = calculateDueDateString(inv.invoiceDate, inv.terms);
    const status = getInvoiceStatus(inv, todayStr);
    const formattedNum = inv.documentType === 'remision' 
      ? (inv.remisionNumero || inv.numero) 
      : formatInvoiceNumber(inv.sucursal, inv.caja, inv.numero);
    
    let paymentDetail = '';
    if (inv.paymentDetails) {
      if (inv.paymentDetails.paymentMethod === 'Transferencia') {
        paymentDetail = `Comp: ${inv.paymentDetails.transferReceipt || '-'} (${inv.paymentDetails.bankName || ''})`;
      } else if (inv.paymentDetails.paymentMethod?.includes('Cheque')) {
        paymentDetail = `Chq: ${inv.paymentDetails.checkNumber || '-'} (${inv.paymentDetails.bankName || ''})`;
      }
    }

    return [
      inv.clientName,
      formattedNum,
      inv.documentType === 'remision' ? 'Remisión' : 'Factura',
      inv.amount.toString(),
      formatDateDMY(inv.invoiceDate),
      inv.terms.toString(),
      formatDateDMY(dueDate),
      status,
      inv.paid ? 'SI' : 'NO',
      inv.paidAmount ? inv.paidAmount.toString() : (inv.paid ? inv.amount.toString() : ''),
      inv.paymentDate ? formatDateDMY(inv.paymentDate) : '',
      inv.paymentMethod || (inv.paid ? 'Efectivo' : ''),
      paymentDetail
    ];
  });

  // Use semicolon as separator for flawless double-click compatibility in Spanish Excel
  return [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';'))
  ].join('\n');
}

// Generate Spanish CSV for Excel and trigger browser download
export function exportInvoicesToCSV(
  invoices: Invoice[],
  title: string,
  todayStr: string
) {
  const csvContent = generateInvoicesCSVContent(invoices, todayStr);

  // Excel UTF-8 BOM
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Build standard backup data object
export function createBackupPayload(invoices: Invoice[], settings: any, clients?: any[], systemDate?: string) {
  return {
    version: '2.0.0',
    appName: 'Control de Pagos y Facturas',
    invoices,
    clients: clients || [],
    settings: {
      darkMode: settings.darkMode,
      username: settings.username,
      passwordEnabled: settings.passwordEnabled,
      passwordHash: settings.passwordHash
    },
    backupDate: new Date().toISOString(),
    systemDate: systemDate || new Date().toISOString().split('T')[0]
  };
}

// Download JSON database backup file
export function exportBackup(invoices: Invoice[], settings: any, clients?: any[]) {
  const data = createBackupPayload(invoices, settings, clients);

  const str = JSON.stringify(data, null, 2);
  const blob = new Blob([str], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `copia_seguridad_pagos_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
