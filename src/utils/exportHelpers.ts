/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Invoice } from '../types';
import { formatDateDMY, formatInvoiceNumber, calculateDueDateString, getInvoiceStatus } from './mockData';

// Generate Spanish CSV for Excel and trigger browser download
export function exportInvoicesToCSV(
  invoices: Invoice[],
  title: string,
  todayStr: string
) {
  // Column definitions matching user's requests
  const headers = [
    'Cliente',
    'Nro Factura',
    'Monto Facturado',
    'Fecha de Factura',
    'Termino (Dias)',
    'Fecha de Vencimiento',
    'Estado',
    '¿Pago?',
    'Monto Pago',
    'Fecha Pago'
  ];

  const rows = invoices.map(inv => {
    const dueDate = calculateDueDateString(inv.invoiceDate, inv.terms);
    const status = getInvoiceStatus(inv, todayStr);
    const formattedNum = formatInvoiceNumber(inv.sucursal, inv.caja, inv.numero);
    
    return [
      inv.clientName,
      formattedNum,
      inv.amount.toString(),
      formatDateDMY(inv.invoiceDate),
      inv.terms.toString(),
      formatDateDMY(dueDate),
      status,
      inv.paid ? 'SI' : 'NO',
      inv.paidAmount ? inv.paidAmount.toString() : '',
      inv.paymentDate ? formatDateDMY(inv.paymentDate) : ''
    ];
  });

  // Use semicolon as separator for flawless double-click compatibility in Spanish Excel
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

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

// Download JSON database backup file
export function exportBackup(invoices: Invoice[], settings: any) {
  const data = {
    version: '1.0.0',
    invoices,
    settings: {
      darkMode: settings.darkMode,
      username: settings.username,
      passwordEnabled: settings.passwordEnabled,
      passwordHash: settings.passwordHash
    },
    backupDate: new Date().toISOString()
  };

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
