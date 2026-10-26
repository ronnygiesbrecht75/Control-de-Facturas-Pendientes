/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client } from '../types';

export type { Client };

export const initialClients: Client[] = [
  { 
    id: "c1", 
    code: 1, 
    name: "GIESBRECHT FEHR, RONNY", 
    ruc: "4985549-2", 
    createdAt: "2026-01-01" 
  },
  { 
    id: "c2", 
    code: 2, 
    name: "GIESBRECHT WIEBE, WALTER", 
    ruc: "1231998-8", 
    createdAt: "2026-01-01" 
  },
  { 
    id: "c3", 
    code: 3, 
    name: "COOP. AGRICOLA DE PRODUCCION SOMMERFELD LTDA.", 
    ruc: "80003626-3", 
    createdAt: "2026-01-01" 
  },
  { 
    id: "c4", 
    code: 4, 
    name: "COOPERATIVA CHORTITZER LTDA.", 
    ruc: "80004464-9", 
    createdAt: "2026-01-01" 
  },
  { 
    id: "c5", 
    code: 5, 
    name: "KRAHN FUNK, JOHAN", 
    ruc: "2025255-2", 
    createdAt: "2026-01-01" 
  }
];
