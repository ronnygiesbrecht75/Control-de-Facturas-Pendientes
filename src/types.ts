/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type InvoiceCategory = 'Facturas' | 'Otras' | 'Cristian';

export type PaymentStatus = 'A Vencer' | 'Vencido' | 'Pagado';

export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Cheque al día' | 'Cheque diferido';

export interface PaymentDetails {
  paymentDate: string;          // Fecha del Pago
  paymentMethod: PaymentMethod; // Método de Pago
  amount: number;              // Monto cobrado
  
  // Detalle Transferencia
  transferReceipt?: string;     // Número de comprobante (opcional)
  bankName?: string;            // Banco
  
  // Detalle Cheques
  checkNumber?: string;         // Número del cheque
  checkIssueDate?: string;      // Fecha de Emisión (para cheque diferido)
  checkDepositDate?: string;    // Fecha del Pago/Cobro (para cheque diferido)
  
  registeredBy?: string;        // P. ej. "Repartidor Móvil"
  registeredAt?: string;        // ISO timestamp
}

export interface Invoice {
  id: string;
  category: InvoiceCategory;
  clientName: string;
  sucursal: string; // e.g. "001"
  caja: string;     // e.g. "009"
  numero: string;   // e.g. "0006493"
  amount: number;   // Monto Facturado in PYG (Guaraníes)
  invoiceDate: string; // YYYY-MM-DD
  terms: number;    // Termino (Dias) - defaults to 0
  paid: boolean;    // ¿Pagó? si / no
  paidAmount?: number; // Monto de Pago (Opcional)
  paymentDate?: string; // Fecha de Pago (Opcional, e.g. "YYYY-MM-DD")
  paymentMethod?: PaymentMethod;
  paymentDetails?: PaymentDetails;
}

export type TabId = 
  | 'registrar-factura'
  | 'registrar-pagos'
  | 'cobro-movil'
  | 'facturas-pendientes'
  | 'facturas'
  | 'otras-facturas'
  | 'cristian-facturas'
  | 'clientes'
  | 'ajustes';

export interface UserPermissions {
  'registrar-factura': boolean;
  'registrar-pagos': boolean;
  'cobro-movil': boolean;
  'facturas-pendientes': boolean;
  'facturas': boolean;
  'otras-facturas': boolean;
  'cristian-facturas': boolean;
  'clientes': boolean;
  'ajustes': boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  permissions: UserPermissions;
  createdAt?: string;
}

export interface UserSettings {
  darkMode: boolean;
  username: string;
  passwordEnabled: boolean;
  passwordHash?: string; // Default admin password
}

export interface BackupData {
  version: string;
  invoices: Invoice[];
  settings: UserSettings;
  users?: UserAccount[];
  backupDate: string;
}

export interface Client {
  id: string;
  name: string;
  createdAt: string;
}

