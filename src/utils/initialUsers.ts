/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserAccount, UserPermissions } from '../types';

export const allPermissionsTrue: UserPermissions = {
  'registrar-factura': true,
  'registrar-pagos': true,
  'cobro-movil': true,
  'facturas-pendientes': true,
  'facturas': true,
  'otras-facturas': true,
  'cristian-facturas': true,
  'clientes': true,
  'ajustes': true
};

export const TAB_LABELS: Record<keyof UserPermissions, string> = {
  'registrar-factura': 'Registrar Facturas',
  'registrar-pagos': 'Registrar Pagos',
  'cobro-movil': 'Cobro Repartidor (Móvil)',
  'facturas-pendientes': 'Facturas Pendientes',
  'facturas': 'Facturas Generales',
  'otras-facturas': 'Otras Facturas',
  'cristian-facturas': 'Cristian',
  'clientes': 'Clientes',
  'ajustes': 'Ajustes'
};

export const initialUsers: UserAccount[] = [
  {
    id: 'user-admin-default',
    username: 'admin',
    passwordHash: '123456',
    role: 'admin',
    permissions: { ...allPermissionsTrue },
    createdAt: '2026-01-01'
  },
  {
    id: 'user-repartidor-default',
    username: 'repartidor',
    passwordHash: '1234',
    role: 'user',
    permissions: {
      'registrar-factura': false,
      'registrar-pagos': false,
      'cobro-movil': true,
      'facturas-pendientes': true,
      'facturas': false,
      'otras-facturas': false,
      'cristian-facturas': false,
      'clientes': false,
      'ajustes': false
    },
    createdAt: '2026-01-01'
  }
];
