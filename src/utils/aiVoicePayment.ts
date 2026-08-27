import { Invoice, PaymentMethod } from '../types';

export interface ParsedVoicePayment {
  sucursal?: string;
  caja?: string;
  numero?: string;
  clientName?: string;
  matchedInvoiceId?: string | null;
  amount?: number;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  bankName?: string;
  transferReceipt?: string;
  checkNumber?: string;
  checkIssueDate?: string;
  checkDepositDate?: string;
  confidence?: number;
  explanation?: string;
}

/**
 * Parses spoken Spanish numbers in Paraguay context (e.g. "un millón y medio" -> 1500000)
 */
export function parseSpokenAmount(text: string): number | null {
  const clean = text.toLowerCase().trim();

  // Direct digits like "150000", "150.000", "1.500.000"
  const digitMatch = clean.match(/(\d[\d\.\,]*\d|\d+)/);
  
  // Word patterns
  let total = 0;
  let hasNumber = false;

  // Check for millions
  const millionMatch = clean.match(/(\d+)\s*(millon|millones|millo)/) || 
                       clean.match(/(un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*(millon|millones)/);
  if (clean.includes('un millon y medio') || clean.includes('un millón y medio')) {
    return 1500000;
  }
  if (clean.includes('dos millones y medio')) {
    return 2500000;
  }

  const wordMap: Record<string, number> = {
    'un': 1, 'uno': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
    'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10, 'veinte': 20,
    'treinta': 30, 'cuarenta': 40, 'cincuenta': 50, 'sesenta': 60, 'setenta': 70,
    'ochenta': 80, 'noventa': 90, 'cien': 100, 'ciento': 100, 'doscientos': 200,
    'trescientos': 300, 'cuatrocientos': 400, 'quinientos': 500, 'seiscientos': 600,
    'setecientos': 700, 'ochocientos': 800, 'novecientos': 900
  };

  if (millionMatch) {
    hasNumber = true;
    const num = isNaN(Number(millionMatch[1])) ? (wordMap[millionMatch[1]] || 1) : Number(millionMatch[1]);
    total += num * 1000000;
  }

  // Check for thousands ("mil" or "k")
  const milMatch = clean.match(/(\d+)\s*(mil|k\b)/);
  if (milMatch) {
    hasNumber = true;
    total += parseInt(milMatch[1], 10) * 1000;
  } else {
    // Look for words before "mil"
    const wordMilMatch = clean.match(/([a-záéíóúñ\s]+)\s+mil\b/);
    if (wordMilMatch) {
      const words = wordMilMatch[1].trim().split(/\s+/);
      let subTotal = 0;
      for (const w of words) {
        if (wordMap[w]) {
          subTotal += wordMap[w];
          hasNumber = true;
        }
      }
      if (subTotal > 0) {
        total += subTotal * 1000;
      }
    }
  }

  // Pure digits fallback
  if (total === 0 && digitMatch) {
    const rawDigits = digitMatch[0].replace(/[\.\,]/g, '');
    const val = parseInt(rawDigits, 10);
    if (!isNaN(val) && val > 0) {
      // If user says "150" in Paraguay context for payment, it might be 150.000 if under 1000
      if (val < 1000 && (clean.includes('mil') || clean.includes('cobro') || clean.includes('pago'))) {
        return val * 1000;
      }
      return val;
    }
  }

  return hasNumber && total > 0 ? total : null;
}

/**
 * Fallback local parser when offline or without Gemini API key
 */
export function parsePaymentOfflineFallback(
  transcript: string,
  invoices: Invoice[],
  systemDate: string
): ParsedVoicePayment {
  const text = transcript.toLowerCase();
  const result: ParsedVoicePayment = {
    paymentDate: systemDate,
    confidence: 0.75,
    explanation: 'Interpretado mediante reconocimiento local'
  };

  // 1. Payment Method Detection
  if (text.includes('transfer') || text.includes('transferencia') || text.includes('giro') || text.includes('banco') || text.includes('sipap')) {
    result.paymentMethod = 'Transferencia';
    // Match common bank
    const banks = [
      'Itaú', 'Continental', 'Sudameris', 'Familiar', 'Atlas', 'GNB', 'BNF', 'Ueno', 'Basa', 'Bancop'
    ];
    for (const b of banks) {
      if (text.includes(b.toLowerCase())) {
        result.bankName = b.startsWith('Banco') ? b : `Banco ${b}`;
        break;
      }
    }
    if (!result.bankName) result.bankName = 'Banco Itaú';
  } else if (text.includes('diferido') || text.includes('cheque adelantado') || text.includes('fecha')) {
    result.paymentMethod = 'Cheque diferido';
    result.checkIssueDate = systemDate;
    result.checkDepositDate = systemDate;
  } else if (text.includes('cheque')) {
    result.paymentMethod = 'Cheque al día';
  } else {
    result.paymentMethod = 'Efectivo';
  }

  // 2. Invoice matching by number or client name
  // Match full format 001-009-0006493 or 001 009 6493
  const fullNumMatch = text.match(/(\d{1,3})[\s\-_]+(\d{1,3})[\s\-_]+(\d{1,7})/);
  if (fullNumMatch) {
    result.sucursal = fullNumMatch[1].padStart(3, '0');
    result.caja = fullNumMatch[2].padStart(3, '0');
    result.numero = fullNumMatch[3].padStart(7, '0');
  } else {
    // Match standalone invoice number like "factura 6493" or "número 6493" or "nº 6493"
    const invMatch = text.match(/(?:factura|fact|facturas|nro|numero|número|num)\s*[:\s#]*(\d{1,7})/i) ||
                     text.match(/\b(\d{4,7})\b/);
    if (invMatch) {
      result.sucursal = '001';
      result.caja = '009';
      result.numero = invMatch[1].padStart(7, '0');
    }
  }

  // Match client name in invoices
  let foundInvoice: Invoice | undefined;
  if (result.numero) {
    foundInvoice = invoices.find(inv => inv.numero.trim().padStart(7, '0') === result.numero);
  }

  if (!foundInvoice) {
    // Try matching by client name string
    foundInvoice = invoices.find(inv => {
      const clientLower = inv.clientName.toLowerCase();
      const words = clientLower.split(/\s+/).filter(w => w.length > 2);
      return words.some(w => text.includes(w));
    });
  }

  if (foundInvoice) {
    result.matchedInvoiceId = foundInvoice.id;
    result.clientName = foundInvoice.clientName;
    result.sucursal = foundInvoice.sucursal || '001';
    result.caja = foundInvoice.caja || '009';
    result.numero = foundInvoice.numero;
    if (!result.amount) {
      result.amount = foundInvoice.amount;
    }
  }

  // 3. Amount parsing
  const amountParsed = parseSpokenAmount(text);
  if (amountParsed) {
    result.amount = amountParsed;
  }

  result.explanation = `Cobro detectado: ${result.amount ? `${result.amount.toLocaleString('es-PY')} Gs.` : ''} en ${result.paymentMethod || 'Efectivo'}${result.clientName ? ` para ${result.clientName}` : ''}${result.numero ? ` (Factura ${result.numero})` : ''}`;

  return result;
}

/**
 * Sends transcript / audio to the server Gemini AI endpoint with client-side fallback
 */
export async function parsePaymentWithAI(
  transcript: string,
  invoices: Invoice[],
  systemDate: string,
  audioBase64?: string,
  audioMimeType?: string
): Promise<ParsedVoicePayment> {
  try {
    const res = await fetch('/api/ai/parse-voice-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcript,
        audioBase64,
        audioMimeType,
        invoiceCandidates: invoices.filter(inv => !inv.paid).map(inv => ({
          id: inv.id,
          clientName: inv.clientName,
          sucursal: inv.sucursal,
          caja: inv.caja,
          numero: inv.numero,
          amount: inv.amount,
          invoiceDate: inv.invoiceDate,
          category: inv.category
        })),
        systemDate
      })
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data as ParsedVoicePayment;
      }
    }
  } catch (err) {
    console.warn('Backend AI unavailable or offline, using smart local parser fallback:', err);
  }

  // Offline / fallback processing
  return parsePaymentOfflineFallback(transcript, invoices, systemDate);
}
