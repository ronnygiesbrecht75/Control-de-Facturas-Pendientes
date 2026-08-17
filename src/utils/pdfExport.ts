/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '../types';
import { 
  formatDateDMY, 
  formatInvoiceNumber, 
  calculateDueDateString, 
  getInvoiceStatus,
  getDaysDifference 
} from './mockData';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { WALTER_LOGO_BASE64 } from '../assets/logoBase64';

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  searchFilter?: string;
  categoryFilter?: string;
  statusFilter?: string;
  systemDate: string;
  companyName?: string;
}

export function formatCategoryShort(cat: string): string {
  const lower = (cat || '').toLowerCase().trim();
  if (lower.includes('otra')) return 'OTRAS';
  if (lower.includes('cristian')) return 'CRIS.';
  if (lower.includes('factura')) return 'FACT.';
  return (cat || '').substring(0, 5).toUpperCase();
}

// Format numbers in Paraguayan Guaranies safely for PDF (ASCII "Gs.")
export function formatMoneyPDF(value: number): string {
  const num = Math.round(value || 0);
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Gs. ${formatted}`;
}

export async function generateInvoicesPDF(
  invoices: Invoice[],
  options: PDFExportOptions
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const company = options.companyName || 'COMERCIAL WALTER';
  const todayFormatted = formatDateDMY(options.systemDate);
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Determine client name
  const uniqueClients = Array.from(new Set(invoices.map((i) => i.clientName.trim()).filter(Boolean)));
  let displayClient = 'Todos los Clientes (General)';
  if (uniqueClients.length === 1) {
    displayClient = uniqueClients[0];
  } else if (options.searchFilter && options.searchFilter.trim()) {
    displayClient = `${options.searchFilter.trim()} (${uniqueClients.length} clientes coincidentes)`;
    if (uniqueClients.length <= 2) {
      displayClient = uniqueClients.join(', ');
    }
  }

  // Determine date range of invoices
  const validDates = invoices
    .map((i) => i.invoiceDate)
    .filter(Boolean)
    .sort();
  
  const fromDate = validDates.length > 0 ? formatDateDMY(validDates[0]) : todayFormatted;
  const toDate = validDates.length > 0 ? formatDateDMY(validDates[validDates.length - 1]) : todayFormatted;

  // 1. HEADER BANNER (Slate-900 with Amber Accent & Walter Logo)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 26, 'F');

  doc.setFillColor(245, 158, 11); // amber-500 line
  doc.rect(0, 26, 210, 1.5, 'F');

  // Top Left Logo - More prominent with a neat, tight white border
  try {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 2.5, 33, 21, 2, 2, 'F');
    doc.addImage(WALTER_LOGO_BASE64, 'PNG', 13, 3.5, 31, 19);
  } catch (err) {
    console.warn('Could not add Walter logo to PDF:', err);
  }

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13.5);
  doc.setFont('helvetica', 'bold');
  doc.text(company, 49, 11.5);

  // Subtitle / Report category
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 158, 11);
  doc.text(options.title.toUpperCase(), 49, 18.5);

  // Right Header: Date when PDF was generated
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Fecha del Reporte: ${todayFormatted}`, 196, 11.5, { align: 'right' });
  doc.text(`Hora: ${timeFormatted}`, 196, 18.5, { align: 'right' });

  // 2. CLIENT AND DATE INFO BOX (As requested: Client Name + Date range + Generation Date)
  let currentY = 32;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(14, currentY, 182, 18, 2, 2, 'FD');

  // Left side: Client Info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('CLIENTE / CUENTA:', 18, currentY + 6);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  // Truncate client name if too long to avoid overlap
  const truncatedClient = displayClient.length > 55 ? displayClient.substring(0, 52) + '...' : displayClient;
  doc.text(truncatedClient, 18, currentY + 13);

  // Right side: Date Range Info (Desde ... Hasta ...)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('RANGO DE FECHAS:', 125, currentY + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`Desde: ${fromDate}   Hasta: ${toDate}`, 125, currentY + 12.5);

  currentY += 23;

  // 3. SUMMARY METRICS CARDS (Total Facturado, Liquidado, Pendiente)
  const totalAmount = invoices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const paidInvoices = invoices.filter((i) => i.paid);
  const unpaidInvoices = invoices.filter((i) => !i.paid);

  const totalPaid = paidInvoices.reduce((acc, curr) => acc + (curr.paidAmount || curr.amount || 0), 0);
  const totalPending = unpaidInvoices.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const cardWidth = 58;
  const cardGap = 4;
  const startX = 14;

  // Card 1: Total Facturado
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(startX, currentY, cardWidth, 14, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(`TOTAL FACTURADO (${invoices.length})`, startX + 4, currentY + 4.5);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatMoneyPDF(totalAmount), startX + 4, currentY + 11);

  // Card 2: Liquidado (Pagado)
  const card2X = startX + cardWidth + cardGap;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(card2X, currentY, cardWidth, 14, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(`LIQUIDADO (${paidInvoices.length})`, card2X + 4, currentY + 4.5);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text(formatMoneyPDF(totalPaid), card2X + 4, currentY + 11);

  // Card 3: Total Pendiente
  const card3X = card2X + cardWidth + cardGap;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(card3X, currentY, cardWidth, 14, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text(`PENDIENTE (${unpaidInvoices.length})`, card3X + 4, currentY + 4.5);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(153, 27, 27);
  doc.text(formatMoneyPDF(totalPending), card3X + 4, currentY + 11);

  currentY += 19;

  // 4. TABLE DATA
  // Total width: 182mm (Margen 14mm a cada lado)
  // Columns: Cliente(50), N° Factura(25), CAT.(11), Emisión(19), Plazo(11), Vence(19), Estado(23), Monto(24) = 182mm
  const tableRows = invoices.map((inv) => {
    const dueDateStr = calculateDueDateString(inv.invoiceDate, inv.terms || 0);
    const status = getInvoiceStatus(inv, options.systemDate);
    const daysDiff = getDaysDifference(dueDateStr, options.systemDate);
    const formattedNum = formatInvoiceNumber(inv.sucursal, inv.caja, inv.numero);

    let statusText: string = status;
    if (status === 'A Vencer') {
      statusText = daysDiff > 0 ? `A Vencer (${daysDiff}d)` : 'Vence Hoy';
    } else if (status === 'Vencido') {
      statusText = `Vencido (${Math.abs(daysDiff)}d)`;
    } else if (status === 'Pagado' && inv.paymentDate) {
      statusText = `Pagado (${formatDateDMY(inv.paymentDate)})`;
    }

    return [
      inv.clientName,
      formattedNum,
      formatCategoryShort(inv.category),
      formatDateDMY(inv.invoiceDate),
      inv.terms ? `${inv.terms}d` : 'Cont.',
      formatDateDMY(dueDateStr),
      statusText,
      formatMoneyPDF(inv.amount),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [[
      'Cliente', 
      'N° Factura', 
      'CAT.', 
      'Emisión', 
      'Plazo', 
      'Vence', 
      'Estado', 
      'Monto'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', halign: 'left' },      // Cliente (Más amplio)
      1: { cellWidth: 25, fontStyle: 'bold', halign: 'center' },    // N° Factura
      2: { cellWidth: 11, fontStyle: 'bold', halign: 'center' },    // CAT. (FACT. / OTRAS / CRIS.)
      3: { cellWidth: 19, halign: 'center' },                       // Emisión (Espacioso para no romper a 2 filas)
      4: { cellWidth: 11, halign: 'center' },                       // Plazo
      5: { cellWidth: 19, halign: 'center' },                       // Vence (Espacioso para no romper a 2 filas)
      6: { cellWidth: 23, halign: 'center' },                       // Estado
      7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },     // Monto (Ajustado y exacto)
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      // Color-code status column
      if (data.section === 'body' && data.column.index === 6) {
        const text = String(data.cell.raw || '');
        if (text.startsWith('Vencido')) {
          data.cell.styles.textColor = [220, 38, 38]; // Red
          data.cell.styles.fontStyle = 'bold';
        } else if (text.startsWith('Pagado')) {
          data.cell.styles.textColor = [5, 150, 105]; // Green
          data.cell.styles.fontStyle = 'bold';
        } else if (text.startsWith('A Vencer') || text.includes('Hoy')) {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Page footer
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount} — Comercial Walter Control de Pagos`,
        105,
        290,
        { align: 'center' }
      );
    },
  });

  // Calculate clean filename
  const cleanTitle = options.title.replace(/\s+/g, '_').toLowerCase();
  const clientSuffix = uniqueClients.length === 1 ? `_${uniqueClients[0].replace(/\s+/g, '_')}` : (options.searchFilter ? `_${options.searchFilter.trim().replace(/\s+/g, '_')}` : '');
  const filename = `${cleanTitle}${clientSuffix}_${options.systemDate}.pdf`;

  // On Mobile (Capacitor Android / iOS), save file locally and trigger native share sheet
  if (Capacitor.isNativePlatform()) {
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: pdfBase64,
        directory: Directory.Cache,
      });

      await Share.share({
        title: options.title,
        text: `Reporte ${options.title} - ${options.companyName || 'Comercial Walter'}`,
        url: savedFile.uri,
        dialogTitle: 'Compartir o Guardar Reporte PDF',
      });
      return;
    } catch (mobileErr) {
      console.warn('Capacitor native share failed, falling back to browser save:', mobileErr);
    }
  }

  // Standard web browser fallback
  doc.save(filename);
}

/**
 * Generate an individual invoice & payment detail receipt PDF
 */
export async function generateSingleInvoiceReceiptPDF(
  invoice: Invoice,
  systemDate: string,
  companyName: string = 'COMERCIAL WALTER'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const formattedNum = formatInvoiceNumber(invoice.sucursal, invoice.caja, invoice.numero);
  const dueDateStr = calculateDueDateString(invoice.invoiceDate, invoice.terms);
  const status = getInvoiceStatus(invoice, systemDate);
  const daysDiff = getDaysDifference(dueDateStr, systemDate);
  const isPaid = !!invoice.paid;
  const paidAmount = invoice.paidAmount ?? (isPaid ? invoice.amount : 0);
  const balanceRemaining = Math.max(0, invoice.amount - paidAmount);

  // Top header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 26, 'F');

  // Amber accent line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 26, 210, 1.5, 'F');

  // Top Left Logo - More prominent with a neat, tight white border
  try {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 2.5, 33, 21, 2, 2, 'F');
    doc.addImage(WALTER_LOGO_BASE64, 'PNG', 13, 3.5, 31, 19);
  } catch (err) {
    console.warn('Could not add Walter logo to Single Invoice PDF:', err);
  }

  // Header texts
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 49, 11.5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('COMPROBANTE Y DETALLE DE FACTURA', 49, 18.5);

  // Top right info
  doc.setFontSize(8.5);
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° FACTURA: ${formattedNum}`, 196, 11.5, { align: 'right' });

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha Emisión: ${formatDateDMY(systemDate)}`, 196, 18.5, { align: 'right' });

  let y = 34;

  // Status & Category Badges
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 14, 2, 2, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`CATEGORÍA: ${invoice.category.toUpperCase()}`, 20, y + 9);

  // Status text color
  if (status === 'Pagado') {
    doc.setTextColor(5, 150, 105);
    doc.text('ESTADO: PAGADO / SALDADO', 190, y + 9, { align: 'right' });
  } else if (status === 'Vencido') {
    doc.setTextColor(220, 38, 38);
    doc.text(`ESTADO: VENCIDO (${Math.abs(daysDiff)} DÍAS ATRASO)`, 190, y + 9, { align: 'right' });
  } else {
    doc.setTextColor(217, 119, 6);
    doc.text(`ESTADO: A VENCER (${daysDiff} DÍAS RESTANTES)`, 190, y + 9, { align: 'right' });
  }

  y += 22;

  // Financial summary 3 blocks
  const blockW = 58;
  const blockH = 22;

  // Block 1: Facturado
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, blockW, blockH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, blockW, blockH, 2, 2, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('MONTO FACTURADO', 18, y + 7);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(formatMoneyPDF(invoice.amount), 18, y + 16);

  // Block 2: Cobrado
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(76, y, blockW, blockH, 2, 2, 'F');
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(76, y, blockW, blockH, 2, 2, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text('MONTO COBRADO / PAGADO', 80, y + 7);
  doc.setFontSize(12);
  doc.setTextColor(4, 120, 87);
  doc.text(formatMoneyPDF(isPaid ? paidAmount : 0), 80, y + 16);

  // Block 3: Saldo
  const isBal = balanceRemaining > 0 || !isPaid;
  if (isBal) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
  } else {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
  }
  doc.roundedRect(138, y, blockW, blockH, 2, 2, 'F');
  doc.roundedRect(138, y, blockW, blockH, 2, 2, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  if (isBal) {
    doc.setTextColor(220, 38, 38);
  } else {
    doc.setTextColor(100, 116, 139);
  }
  doc.text('SALDO PENDIENTE', 142, y + 7);
  doc.setFontSize(12);
  if (isBal) {
    doc.setTextColor(185, 28, 28);
  } else {
    doc.setTextColor(71, 85, 105);
  }
  doc.text(formatMoneyPDF(isPaid ? balanceRemaining : invoice.amount), 142, y + 16);

  y += 30;

  // Invoice Data Table
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [['DATOS GENERALES DE LA FACTURA', '']],
    body: [
      ['Cliente / Razón Social', invoice.clientName],
      ['N° de Factura Completo', formattedNum],
      ['Fecha de Emisión', formatDateDMY(invoice.invoiceDate)],
      ['Condición / Plazo de Crédito', invoice.terms && invoice.terms > 0 ? `${invoice.terms} días` : 'Contado'],
      ['Fecha de Vencimiento', formatDateDMY(dueDateStr)],
    ],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 122 },
    },
    margin: { left: 14, right: 14 },
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;

  // Payment Data Table
  const paymentRows: any[] = [];
  if (isPaid) {
    paymentRows.push(['Estado de Pago', 'PAGADO Y CONFIRMADO']);
    paymentRows.push(['Fecha del Pago', formatDateDMY(invoice.paymentDate || invoice.invoiceDate)]);
    paymentRows.push(['Método de Pago', invoice.paymentMethod || invoice.paymentDetails?.paymentMethod || 'Efectivo']);
    if (invoice.paymentDetails?.bankName) {
      paymentRows.push(['Banco', invoice.paymentDetails.bankName]);
    }
    if (invoice.paymentDetails?.transferReceipt) {
      paymentRows.push(['N° de Comprobante / Ref.', invoice.paymentDetails.transferReceipt]);
    }
    if (invoice.paymentDetails?.checkNumber) {
      paymentRows.push(['Número de Cheque', invoice.paymentDetails.checkNumber]);
    }
    if (invoice.paymentDetails?.checkIssueDate) {
      paymentRows.push(['Fecha Emisión Cheque', formatDateDMY(invoice.paymentDetails.checkIssueDate)]);
    }
    if (invoice.paymentDetails?.checkDepositDate) {
      paymentRows.push(['Fecha Cobro / Depósito Cheque', formatDateDMY(invoice.paymentDetails.checkDepositDate)]);
    }
    if (invoice.paymentDetails?.registeredBy) {
      paymentRows.push(['Cobrado / Registrado por', invoice.paymentDetails.registeredBy]);
    }
    if (invoice.paymentDetails?.registeredAt) {
      paymentRows.push(['Hora y Fecha de Registro', new Date(invoice.paymentDetails.registeredAt).toLocaleString()]);
    }
  } else {
    paymentRows.push(['Estado de Pago', 'PENDIENTE DE COBRO']);
    paymentRows.push(['Observación', 'Esta factura aún no registra pagos en el sistema.']);
  }

  autoTable(doc, {
    startY: nextY,
    theme: 'grid',
    head: [['DETALLE DEL PAGO / COBRO', '']],
    body: paymentRows,
    headStyles: {
      fillColor: isPaid ? [5, 150, 105] : [217, 119, 6],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 122 },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer text
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento generado electrónicamente el ${formatDateDMY(systemDate)} — Comercial Walter Control de Pagos`,
    105,
    finalY < 280 ? finalY : 285,
    { align: 'center' }
  );

  const cleanNum = formattedNum.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Factura_${cleanNum}_Detalle_${systemDate}.pdf`;

  // On Mobile (Capacitor Android / iOS), save file locally and trigger native share sheet
  if (Capacitor.isNativePlatform()) {
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: pdfBase64,
        directory: Directory.Cache,
      });

      await Share.share({
        title: `Factura ${formattedNum}`,
        text: `Comprobante y Detalle de Factura ${formattedNum} - ${invoice.clientName}`,
        url: savedFile.uri,
        dialogTitle: 'Compartir o Guardar Factura PDF',
      });
      return;
    } catch (mobileErr) {
      console.warn('Capacitor single invoice share failed:', mobileErr);
    }
  }

  // Web download
  doc.save(filename);
}

