/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Invoice, 
  InvoiceCategory, 
  UserSettings,
  Client,
  PaymentDetails,
  UserAccount,
  UserPermissions,
  TabId
} from './types';
import { 
  initialInvoices, 
  defaultSettings, 
  getInvoiceStatus,
  formatPYG
} from './utils/mockData';
import {
  initialClients
} from './utils/initialClients';
import {
  initialUsers,
  allPermissionsTrue
} from './utils/initialUsers';
import { 
  exportInvoicesToCSV, 
  exportBackup 
} from './utils/exportHelpers';

import { 
  subscribeInvoices, 
  syncInvoiceToCloud, 
  removeInvoiceFromCloud, 
  removeAllInvoicesFromCloud,
  subscribeClients,
  syncClientToCloud,
  removeClientFromCloud,
  subscribeSettings,
  syncSettingsToCloud,
  subscribeUsers,
  syncUserToCloud,
  removeUserFromCloud
} from './lib/syncService';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// Subcomponents
import LockScreen from './components/LockScreen';
import RegistrarFactura from './components/RegistrarFactura';
import FacturasPendientes from './components/FacturasPendientes';
import FacturaList from './components/FacturaList';
import RegistrarPagos from './components/RegistrarPagos';
import Clientes from './components/Clientes';
import Ajustes from './components/Ajustes';
import CobroMovilRepartidor from './components/CobroMovilRepartidor';

// Icons for navigation sidebar - all from lucide-react as required
import { 
  PlusCircle, 
  Flame, 
  Layers, 
  Briefcase, 
  UserCheck, 
  CreditCard, 
  Settings2,
  Calendar,
  Lock,
  LogOut,
  FolderOpen,
  ArrowRight,
  Database,
  Download,
  AlertTriangle,
  ChevronRight,
  Menu,
  X,
  Users,
  Smartphone,
  Truck,
  ShieldCheck,
  User
} from 'lucide-react';

export default function App() {
  // --- STATE PERSISTENCE CLIENT-SIDE ---
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('pagos_app_invoices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading invoices from localStorage, falling back.', e);
      }
    }
    return initialInvoices;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('pagos_app_clients');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading clients from localStorage, falling back.', e);
      }
    }
    return initialClients;
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('pagos_app_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading settings from localStorage, falling back.', e);
      }
    }
    return defaultSettings;
  });

  // Registered multi-user accounts state
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('pagos_app_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return initialUsers;
  });

  // Currently authenticated user session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('pagos_app_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return initialUsers[0]; // Default to Admin
  });

  // Current system virtual date for status calculations - defaults to today's date dynamically
  const [systemDate, setSystemDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Navigation tab state
  const [currentTab, setCurrentTab] = useState<string>('registrar-factura');

  // Mobile sidebar visibility
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Authentication session state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // If password requirement is disabled, start unlocked
    const savedSettings = localStorage.getItem('pagos_app_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return !parsed.passwordEnabled;
      } catch (e) {}
    }
    return !defaultSettings.passwordEnabled;
  });

  // Modal overviews
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importNotice, setImportNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Sync state changes with local storage
  useEffect(() => {
    localStorage.setItem('pagos_app_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('pagos_app_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('pagos_app_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pagos_app_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pagos_app_current_user');
    }
  }, [currentUser]);

  // Sync settings and HTML theme
  useEffect(() => {
    localStorage.setItem('pagos_app_settings', JSON.stringify(settings));
    
    // Apply dark mode class to root HTML
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Configure native Android/iOS Status Bar (keep native phone indicators visible: battery, clock, icons)
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
        StatusBar.setStyle({ style: settings.darkMode ? Style.Dark : Style.Light }).catch(() => {});
        StatusBar.setBackgroundColor({ color: settings.darkMode ? '#1c1c1f' : '#ffffff' }).catch(() => {});
        StatusBar.show().catch(() => {});
      } catch (e) {
        console.warn('Status bar native config error:', e);
      }
    }
    
    // If they disabled password protection, ensure they are authenticated
    if (!settings.passwordEnabled) {
      setIsAuthenticated(true);
    }
  }, [settings]);

  // --- FIRESTORE REALTIME SYNC (PC ↔ MOBILE CLOUD DATABASE) ---
  useEffect(() => {
    const unsubInvoices = subscribeInvoices((cloudInvoices) => {
      if (cloudInvoices && cloudInvoices.length > 0) {
        setInvoices(cloudInvoices);
      } else {
        // Seed cloud database on first run if empty
        initialInvoices.forEach((inv) => syncInvoiceToCloud(inv));
      }
    });

    const unsubClients = subscribeClients((cloudClients) => {
      if (cloudClients && cloudClients.length > 0) {
        setClients(cloudClients);
      } else {
        initialClients.forEach((c) => syncClientToCloud(c));
      }
    });

    const unsubSettings = subscribeSettings((cloudSettings) => {
      if (cloudSettings) {
        setSettings(cloudSettings);
      }
    });

    const unsubUsers = subscribeUsers((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
      } else {
        initialUsers.forEach((u) => syncUserToCloud(u));
      }
    });

    return () => {
      unsubInvoices();
      unsubClients();
      unsubSettings();
      unsubUsers();
    };
  }, []);

  // --- USER MANAGEMENT & PERMISSIONS ---
  const handleSaveUser = (user: UserAccount) => {
    setUsers((prev) => {
      const index = prev.findIndex((u) => u.id === user.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = user;
        return copy;
      } else {
        return [user, ...prev];
      }
    });

    // If updating currently logged in user, update session state
    if (currentUser && currentUser.id === user.id) {
      setCurrentUser(user);
    }

    syncUserToCloud(user);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    removeUserFromCloud(userId);
  };

  // Helper to verify if logged in user has permission for a given tab
  const hasTabPermission = (tabId: string): boolean => {
    if (!currentUser) return true;
    if (currentUser.role === 'admin') return true;
    return !!currentUser.permissions?.[tabId as keyof UserPermissions];
  };

  // Auto-redirect if current active tab is disallowed for current user
  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.role !== 'admin') {
      if (!hasTabPermission(currentTab)) {
        const allTabs: TabId[] = [
          'registrar-factura',
          'registrar-pagos',
          'cobro-movil',
          'facturas-pendientes',
          'facturas',
          'otras-facturas',
          'cristian-facturas',
          'clientes',
          'ajustes'
        ];
        const firstAllowed = allTabs.find((t) => currentUser.permissions?.[t]);
        if (firstAllowed) {
          setCurrentTab(firstAllowed);
        }
      }
    }
  }, [currentTab, currentUser, isAuthenticated]);

  // --- ACTIONS ---
  
  // Clientes Tab Actions
  const handleAddClient = (name: string): boolean | string => {
    const exists = clients.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      return 'El cliente ya se encuentra registrado.';
    }
    const newClient: Client = {
      id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      createdAt: systemDate
    };
    setClients(prev => [newClient, ...prev]);
    syncClientToCloud(newClient);
    return true;
  };

  const handleDeleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    removeClientFromCloud(id);
  };

  const handleClearAllInvoices = () => {
    setInvoices([]);
    localStorage.removeItem('pagos_app_invoices');
    removeAllInvoicesFromCloud();
  };

  const handleResetApp = () => {
    localStorage.removeItem('pagos_app_invoices');
    localStorage.removeItem('pagos_app_clients');
    localStorage.removeItem('pagos_app_settings');
    removeAllInvoicesFromCloud();
    setInvoices([]);
    setClients(initialClients);
    setSettings(defaultSettings);
    initialInvoices.forEach((inv) => syncInvoiceToCloud(inv));
    initialClients.forEach((c) => syncClientToCloud(c));
    syncSettingsToCloud(defaultSettings);
  };
  
  // Tab 1: Registrar nueva factura
  const handleAddInvoice = (newInv: Omit<Invoice, 'id'>) => {
    const invoiceToAdd: Invoice = {
      ...newInv,
      id: `invoice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setInvoices((prev) => [invoiceToAdd, ...prev]);
    syncInvoiceToCloud(invoiceToAdd);
  };

  // Delete invoice with safeguard
  const handleDeleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    removeInvoiceFromCloud(id);
  };

  // Edit/Update entire invoice
  const handleEditInvoice = (updatedInvoice: Invoice) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv))
    );
    syncInvoiceToCloud(updatedInvoice);
  };

  // Flip paid state quickly from tables
  const handleTogglePaid = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const nextPaid = !inv.paid;
          const updatedInv: Invoice = {
            ...inv,
            paid: nextPaid,
            paidAmount: nextPaid ? inv.amount : undefined,
            paymentDate: nextPaid ? systemDate : undefined
          };
          syncInvoiceToCloud(updatedInv);
          return updatedInv;
        }
        return inv;
      })
    );
  };

  // Tab 6: Registrar/Editar Pago de manera detallada
  const handleUpdatePayment = (
    id: string, 
    paidState: boolean, 
    amount?: number, 
    date?: string,
    details?: PaymentDetails
  ) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const updatedInv: Invoice = {
            ...inv,
            paid: paidState,
            paidAmount: paidState ? (amount ?? inv.amount) : undefined,
            paymentDate: paidState ? (date ?? systemDate) : undefined,
            paymentMethod: paidState ? (details?.paymentMethod || inv.paymentMethod || 'Efectivo') : undefined,
            paymentDetails: paidState ? (details || inv.paymentDetails) : undefined
          };
          syncInvoiceToCloud(updatedInv);
          return updatedInv;
        }
        return inv;
      })
    );
  };

  // Mobile Delivery Collector payment handler
  const handleRegisterMobilePayment = (
    invoiceId: string,
    details: PaymentDetails,
    sucursal: string,
    caja: string,
    numero: string,
    clientName?: string
  ) => {
    setInvoices((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === invoiceId);
      if (existingIndex >= 0) {
        return prev.map((inv, idx) => {
          if (idx === existingIndex) {
            const updatedInv: Invoice = {
              ...inv,
              paid: true,
              paidAmount: details.amount,
              paymentDate: details.paymentDate,
              paymentMethod: details.paymentMethod,
              paymentDetails: details
            };
            syncInvoiceToCloud(updatedInv);
            return updatedInv;
          }
          return inv;
        });
      } else {
        // Create new paid invoice entry if not pre-existing
        const newInv: Invoice = {
          id: invoiceId,
          category: 'Facturas',
          clientName: clientName || 'Cliente Móvil',
          sucursal,
          caja,
          numero,
          amount: details.amount,
          invoiceDate: details.paymentDate,
          terms: 0,
          paid: true,
          paidAmount: details.amount,
          paymentDate: details.paymentDate,
          paymentMethod: details.paymentMethod,
          paymentDetails: details
        };
        syncInvoiceToCloud(newInv);
        return [newInv, ...prev];
      }
    });
  };

  // Tab 7: Actualizar Ajustes
  const handleUpdateSettings = (newSet: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSet };
      syncSettingsToCloud(updated);
      return updated;
    });
  };

  // Import local database backup from JSON file
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string);
        if (payload.version && Array.isArray(payload.invoices)) {
          setInvoices(payload.invoices);
          if (payload.settings) {
            setSettings(payload.settings);
          }
          setImportNotice({ type: 'success', msg: '¡Copia de seguridad restaurada exitosamente!' });
          setTimeout(() => {
            setImportNotice(null);
            setBackupModalOpen(false);
          }, 3000);
        } else {
          setImportNotice({ type: 'error', msg: 'Formato de archivo inválido. Revise su respaldo.' });
        }
      } catch (err) {
        setImportNotice({ type: 'error', msg: 'Error al interpretar el JSON. Archivo dañado.' });
      }
    };
    reader.readAsText(file);
  };

  // --- CSV TRIGGER CONVERTERS FOR MODAL EXPORTS ---
  const handleExportTabSummary = (tabOption: number) => {
    if (tabOption === 2) {
      // Tab 2 - Facturas a vencer y vencidas (category = 'Facturas' are unpaid)
      const targetList = invoices.filter(i => i.category === 'Facturas' && !i.paid);
      exportInvoicesToCSV(targetList, 'Resumen_Facturas_Pendientes_P2', systemDate);
    } else if (tabOption === 3) {
      // Tab 3 - Planilla de Facturas
      const targetList = invoices.filter(i => i.category === 'Facturas');
      exportInvoicesToCSV(targetList, 'Planilla_Facturas_Generales_P3', systemDate);
    } else if (tabOption === 4) {
      // Tab 4 - Otras Facturas
      const targetList = invoices.filter(i => i.category === 'Otras');
      exportInvoicesToCSV(targetList, 'Planilla_Otras_Facturas_P4', systemDate);
    } else if (tabOption === 5) {
      // Tab 5 - Facturas Cristian
      const targetList = invoices.filter(i => i.category === 'Cristian');
      exportInvoicesToCSV(targetList, 'Planilla_Facturas_Cristian_P5', systemDate);
    } else {
      // All
      exportInvoicesToCSV(invoices, 'Control_De_Pagos_Base_Completa', systemDate);
    }
    setExportModalOpen(false);
  };

  // Render LockScreen wrapper if security is active and we are not verified yet
  if (settings.passwordEnabled && !isAuthenticated) {
    return (
      <LockScreen 
        settings={settings}
        users={users}
        onUnlockWithUser={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }} 
      />
    );
  }

  // Count outstanding items for red badge alerts (unpaid & category = 'Facturas')
  const overdueCount = invoices.filter(
    i => i.category === 'Facturas' && !i.paid && getInvoiceStatus(i, systemDate) === 'Vencido'
  ).length;

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row font-sans transition-colors duration-200">
      
      {/* DESKTOP SIDEBAR - Agro Servicios AHF Reference Layout */}
      <aside className="hidden lg:flex w-72 h-screen sticky top-0 bg-amber-500 border-r border-amber-600 flex-col justify-between text-slate-900 flex-shrink-0 select-none overflow-y-auto z-30">
        <div>
          {/* Header section with brand */}
          <div className="p-5 pb-6 border-b border-amber-600 flex items-center gap-3">
            {/* White rounded box with circular emblem */}
            <div className="bg-white rounded-2xl w-14 h-14 p-1.5 flex items-center justify-center shadow-md flex-shrink-0">
              <div className="bg-gradient-to-tr from-[#0f172a] to-[#1e3a8a] rounded-full w-full h-full flex items-center justify-center text-white font-bold text-xs shadow-inner">
                {/* Visual replacement of logo, using Database symbol with amber details */}
                <Database className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xs font-black font-display text-slate-950 leading-tight">
                Comercial Walter
              </h2>
              <p className="text-[10px] font-black tracking-wider text-slate-900 uppercase mt-0.5 font-mono">
                Control de Pagos
              </p>
            </div>
          </div>

          {/* Sidebar Menu divided into styled section groups */}
          <div className="p-4 py-6 space-y-6">
            
            {/* Group 1: REGISTRO CENTRAL & SECTORES */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-900/60 font-black uppercase tracking-widest px-3 font-mono block mb-2">
                Control Central
              </span>
              
              {hasTabPermission('registrar-factura') && (
                <button
                  id="sidebar-tab-registrar-factura"
                  onClick={() => setCurrentTab('registrar-factura')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    currentTab === 'registrar-factura'
                      ? 'bg-[#0f172a] text-white shadow-md'
                      : 'text-slate-900 hover:bg-amber-600/30 hover:text-slate-950'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Registrar Factura</span>
                </button>
              )}

              {hasTabPermission('registrar-pagos') && (
                <button
                  id="sidebar-tab-registrar-pagos"
                  onClick={() => setCurrentTab('registrar-pagos')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    currentTab === 'registrar-pagos'
                      ? 'bg-[#0f172a] text-white shadow-md'
                      : 'text-slate-900 hover:bg-amber-600/30 hover:text-slate-950'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Registrar Pagos</span>
                </button>
              )}

              {hasTabPermission('cobro-movil') && (
                <button
                  id="sidebar-tab-cobro-movil"
                  onClick={() => setCurrentTab('cobro-movil')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    currentTab === 'cobro-movil'
                      ? 'bg-[#0f172a] text-white shadow-md'
                      : 'text-slate-900 hover:bg-amber-600/30 hover:text-slate-950'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-slate-950 dark:text-amber-400" />
                  <span>Cobro Repartidor (Móvil)</span>
                </button>
              )}

              {hasTabPermission('facturas-pendientes') && (
                <button
                  id="sidebar-tab-facturas-pendientes"
                  onClick={() => setCurrentTab('facturas-pendientes')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    currentTab === 'facturas-pendientes'
                      ? 'bg-[#0f172a] text-white shadow-md'
                      : 'text-slate-900 hover:bg-amber-600/30 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Flame className="w-4 h-4" />
                    <span>Facturas Pendientes</span>
                  </div>
                  {overdueCount > 0 ? (
                    <span className={`font-bold text-[9px] px-2 py-0.5 rounded-full font-mono ${
                      currentTab === 'facturas-pendientes' ? 'bg-rose-700 text-white animate-pulse' : 'bg-rose-500 text-white'
                    }`}>
                      {overdueCount} Vencido
                    </span>
                  ) : null}
                </button>
              )}

              {hasTabPermission('facturas') && (
                <button
                  id="sidebar-tab-facturas"
                  onClick={() => setCurrentTab('facturas')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    currentTab === 'facturas'
                      ? 'bg-[#0f172a] text-white shadow-md'
                      : 'text-slate-900 hover:bg-amber-600/30 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4" />
                    <span>Facturas (Gral.)</span>
                  </div>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                    currentTab === 'facturas' ? 'bg-white/20 text-white font-bold' : 'bg-slate-950/10 text-slate-900 font-bold'
                  }`}>
                    {invoices.filter(i => i.category === 'Facturas').length}
                  </span>
                </button>
              )}

              {hasTabPermission('otras-facturas') && (
                <button
                  id="sidebar-tab-otras-facturas"
                  onClick={() => setCurrentTab('otras-facturas')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    currentTab === 'otras-facturas'
                      ? 'bg-[#0f172a] text-white shadow-md'
                      : 'text-slate-900 hover:bg-amber-600/30 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4" />
                    <span>Otras Facturas</span>
                  </div>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                    currentTab === 'otras-facturas' ? 'bg-white/20 text-white font-bold' : 'bg-slate-950/10 text-slate-900 font-bold'
                  }`}>
                    {invoices.filter(i => i.category === 'Otras').length}
                  </span>
                </button>
              )}

              {hasTabPermission('cristian-facturas') && (
                <button
                  id="sidebar-tab-cristian"
                  onClick={() => setCurrentTab('cristian-facturas')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    currentTab === 'cristian-facturas'
                      ? 'bg-[#0f172a] text-white shadow-md'
                      : 'text-slate-900 hover:bg-amber-600/30 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-4 h-4" />
                    <span>Cristian</span>
                  </div>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                    currentTab === 'cristian-facturas' ? 'bg-white/20 text-white font-bold' : 'bg-slate-950/10 text-slate-900 font-bold'
                  }`}>
                    {invoices.filter(i => i.category === 'Cristian').length}
                  </span>
                </button>
              )}

              {hasTabPermission('clientes') && (
                <button
                  id="sidebar-tab-clientes"
                  onClick={() => setCurrentTab('clientes')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    currentTab === 'clientes'
                      ? 'bg-[#0f172a] text-white shadow-md'
                      : 'text-slate-900 hover:bg-amber-600/30 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4" />
                    <span>Clientes</span>
                  </div>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                    currentTab === 'clientes' ? 'bg-white/20 text-white font-bold' : 'bg-slate-950/10 text-slate-900 font-bold'
                  }`}>
                    {clients.length}
                  </span>
                </button>
              )}
            </div>

            {/* Group 3: CONFIGURACIÓN */}
            {hasTabPermission('ajustes') && (
              <div className="space-y-1">
                <span className="text-[10px] text-slate-900/60 font-black uppercase tracking-widest px-3 font-mono block mb-2">
                  Configuración
                </span>

                <button
                  id="sidebar-tab-ajustes"
                  onClick={() => setCurrentTab('ajustes')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    currentTab === 'ajustes'
                      ? 'bg-[#0f172a] text-white shadow-md'
                      : 'text-slate-900 hover:bg-amber-600/30 hover:text-slate-950'
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                  <span>Ajustes</span>
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Bottom Panel with Active User Badge + Version + Cerrar Sesión */}
        <div className="p-4 space-y-3 border-t border-amber-600 bg-amber-600/20">
          {currentUser && (
            <div className="bg-[#0f172a] text-white p-2.5 rounded-xl flex items-center gap-2.5 shadow-sm">
              <div className="p-1.5 bg-amber-500 rounded-lg text-slate-950">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold truncate leading-tight">{currentUser.username}</div>
                <div className="text-[9px] text-amber-400 font-mono capitalize">
                  {currentUser.role === 'admin' ? 'Administrador' : 'Usuario'}
                </div>
              </div>
            </div>
          )}

          <div className="text-center select-none">
            <div className="text-[10px] font-black tracking-wider text-amber-950 bg-amber-400/40 py-0.5 px-2.5 rounded-full inline-block">
              Versión 1.2
            </div>
          </div>

          {settings.passwordEnabled && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-600/10 hover:bg-rose-600 hover:text-white text-rose-950 border border-rose-600/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      </aside>

      {/* RIGHT WORKSPACE AREA - Takes remaining space on desktop */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        
        {/* Fixed Header / Navbar - stays completely static while scrolling */}
        <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm backdrop-blur-md bg-white/95 dark:bg-slate-800/95">
          <div className="w-full max-w-full px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg lg:hidden flex-shrink-0 text-slate-800 dark:text-slate-200"
                aria-label="Abrir navegación"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div className="bg-[#0f172a] lg:hidden p-1.5 rounded-lg text-white font-bold flex items-center justify-center flex-shrink-0">
                <Database className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              </div>
              <div className="lg:hidden truncate">
                <h1 className="text-xs sm:text-sm font-bold tracking-tight font-display text-slate-900 dark:text-slate-100 truncate">
                  Comercial Walter
                </h1>
                <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider truncate">Control de Pagos</p>
              </div>
            </div>

            {/* Quick system date control & Cloud sync status */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fecha:
                </span>
                <input
                  id="global-system-date-picker"
                  type="date"
                  value={systemDate}
                  onChange={(e) => setSystemDate(e.target.value)}
                  className="px-1 py-0.5 border-none bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                />
              </div>

              {/* Cloud Real-Time Sync Indicator */}
              <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Nube Sincronizada (PC ↔ Celular)</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {currentUser && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold">
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  <span>{currentUser.username}</span>
                </div>
              )}

              <button
                id="top-open-export-modal"
                onClick={() => setExportModalOpen(true)}
                className="hidden md:flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-lg transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 text-amber-400" />
                Exportar Resumen
              </button>
              
              <button
                id="top-open-backup-modal"
                onClick={() => setBackupModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold py-1.5 px-2.5 sm:px-3 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span className="hidden sm:inline">Copia de Seguridad</span>
                <span className="sm:hidden">Backup</span>
              </button>

              {settings.passwordEnabled && (
                <button
                  id="top-logout-btn"
                  onClick={handleLogout}
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg transition-all cursor-pointer lg:hidden"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* MOBILE SIDEBAR DRAWERS */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-xs">
            <div className="w-80 bg-amber-500 border-r border-amber-600 text-slate-900 h-full p-4 flex flex-col justify-between animate-fade-in">
              <div>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-600">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-white rounded-xl w-10 h-10 p-1 flex items-center justify-center">
                      <div className="bg-gradient-to-tr from-[#0f172a] to-[#1e3a8a] rounded-full w-full h-full flex items-center justify-center text-white">
                        <Database className="w-4 h-4 text-amber-400" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xs font-black font-display text-slate-950">Comercial Walter</h2>
                      <p className="text-[8px] font-bold text-slate-900 tracking-wider">Control de Pagos</p>
                    </div>
                  </div>
                  <button onClick={() => setMobileSidebarOpen(false)} className="p-1 rounded-full bg-[#0f172a]/10 hover:bg-[#0f172a]/20">
                    <X className="w-5 h-5 text-slate-950" />
                  </button>
                </div>
                
                <nav className="space-y-4">
                  {/* Group 1 & 2 combined */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-900/60 font-black uppercase tracking-wider block px-2 mb-1.5 font-mono">Control Central</span>
                    {[
                      { id: 'registrar-factura', label: 'Registrar Factura', icon: PlusCircle },
                      { id: 'registrar-pagos', label: 'Registrar Pagos', icon: CreditCard },
                      { id: 'cobro-movil', label: 'Cobro Repartidor (Móvil)', icon: Smartphone },
                      { id: 'facturas-pendientes', label: 'Facturas Pendientes', icon: Flame },
                      { id: 'facturas', label: 'Facturas (Gral.)', icon: Layers },
                      { id: 'otras-facturas', label: 'Otras Facturas', icon: Briefcase },
                      { id: 'cristian-facturas', label: 'Cristian', icon: UserCheck },
                      { id: 'clientes', label: 'Clientes', icon: Users },
                    ].filter(tab => hasTabPermission(tab.id)).map((tab) => {
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setCurrentTab(tab.id);
                            setMobileSidebarOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                            currentTab === tab.id
                              ? 'bg-[#0f172a] text-white shadow-md'
                              : 'text-slate-900 hover:bg-amber-600/30 hover:text-slate-950'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <TabIcon className="w-4 h-4" />
                            <span>{tab.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Group 3 */}
                  {hasTabPermission('ajustes') && (
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-900/60 font-black uppercase tracking-wider block px-2 mb-1.5 font-mono">Ajustes</span>
                      {[
                        { id: 'ajustes', label: 'Ajustes', icon: Settings2 }
                      ].map((tab) => {
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setCurrentTab(tab.id);
                              setMobileSidebarOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                              currentTab === tab.id
                                ? 'bg-[#0f172a] text-white shadow-md'
                                : 'text-slate-900 hover:bg-amber-600/30 hover:text-slate-950'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <TabIcon className="w-4 h-4" />
                              <span>{tab.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </nav>
              </div>

              {/* Mobile bottom shortcuts */}
              <div className="space-y-2 pt-4 border-t border-amber-600">
                <button
                  onClick={() => { setExportModalOpen(true); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  Exportar Resumen
                </button>
                {settings.passwordEnabled && (
                  <button
                    onClick={() => { handleLogout(); setMobileSidebarOpen(false); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-xs bg-rose-600/10 hover:bg-rose-600 hover:text-white text-rose-950 border border-rose-600/30 rounded-xl font-bold transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE WORKSPACE ZONE */}
        <div className="w-full max-w-full px-4 lg:px-8 py-6 flex-1">
          <main className="space-y-6">
            {currentTab === 'registrar-factura' && (
              <RegistrarFactura 
                onAddInvoice={handleAddInvoice} 
                systemDate={systemDate} 
                clients={clients}
              />
            )}

            {currentTab === 'facturas-pendientes' && (
              <FacturasPendientes 
                invoices={invoices} 
                systemDate={systemDate} 
              />
            )}

            {currentTab === 'facturas' && (
              <FacturaList 
                category="Facturas"
                invoices={invoices}
                onDeleteInvoice={handleDeleteInvoice}
                onTogglePaid={handleTogglePaid}
                onEditInvoice={handleEditInvoice}
                clients={clients}
                systemDate={systemDate}
              />
            )}

            {currentTab === 'otras-facturas' && (
              <FacturaList 
                category="Otras"
                invoices={invoices}
                onDeleteInvoice={handleDeleteInvoice}
                onTogglePaid={handleTogglePaid}
                onEditInvoice={handleEditInvoice}
                clients={clients}
                systemDate={systemDate}
              />
            )}

            {currentTab === 'cristian-facturas' && (
              <FacturaList 
                category="Cristian"
                invoices={invoices}
                onDeleteInvoice={handleDeleteInvoice}
                onTogglePaid={handleTogglePaid}
                onEditInvoice={handleEditInvoice}
                clients={clients}
                systemDate={systemDate}
              />
            )}

            {currentTab === 'registrar-pagos' && (
              <RegistrarPagos 
                invoices={invoices}
                onUpdatePayment={handleUpdatePayment}
                systemDate={systemDate}
              />
            )}

            {currentTab === 'cobro-movil' && (
              <CobroMovilRepartidor
                invoices={invoices}
                onRegisterMobilePayment={handleRegisterMobilePayment}
                systemDate={systemDate}
              />
            )}

            {currentTab === 'clientes' && (
              <Clientes 
                clients={clients}
                onAddClient={handleAddClient}
                onDeleteClient={handleDeleteClient}
              />
            )}

            {currentTab === 'ajustes' && (
              <Ajustes 
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                users={users}
                currentUser={currentUser}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
                onClearAllInvoices={handleClearAllInvoices}
                onResetApp={handleResetApp}
              />
            )}
          </main>
        </div>

        {/* FOOTER */}
        <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-4 text-center text-slate-500 dark:text-slate-400 text-xs">
          <p className="font-semibold font-display text-slate-700 dark:text-slate-300">
            Control de Pagos © 2026. Todos los derechos reservados.
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Diseñado para cumplir con los requisitos fiscales y organizativos del mercado Paraguayo.
          </p>
        </footer>
      </div>

      {/* --- EXPORT MODAL --- */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-350 dark:border-slate-700 animate-fade-in text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="font-bold text-base font-display">Exportar Resumen Reporte</h3>
              <button 
                onClick={() => setExportModalOpen(false)} 
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-550 dark:text-slate-400">
                Seleccione la pestaña de datos que desea exportar en formato compatible con planillas como Excel (.csv con separadores españoles).
              </p>

              <div className="grid grid-cols-1 gap-2 pt-2">
                <button
                  id="export-tab-2-btn"
                  onClick={() => handleExportTabSummary(2)}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 text-left cursor-pointer"
                >
                  <span className="text-slate-700 dark:text-slate-250">Opción 1: Reporte de Vencimientos (Pendiente)</span>
                  <ArrowRight className="w-4 h-4 text-primary-gold" />
                </button>
                <button
                  id="export-tab-3-btn"
                  onClick={() => handleExportTabSummary(3)}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 text-left cursor-pointer"
                >
                  <span className="text-slate-700 dark:text-slate-250">Opción 2: Planilla General de Facturas Registradas</span>
                  <ArrowRight className="w-4 h-4 text-primary-gold" />
                </button>
                <button
                  id="export-tab-4-btn"
                  onClick={() => handleExportTabSummary(4)}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 text-left cursor-pointer"
                >
                  <span className="text-slate-700 dark:text-slate-250">Opción 3: Planilla de Otras Facturas</span>
                  <ArrowRight className="w-4 h-4 text-primary-gold" />
                </button>
                <button
                  id="export-tab-5-btn"
                  onClick={() => handleExportTabSummary(5)}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 text-left cursor-pointer"
                >
                  <span className="text-slate-700 dark:text-slate-250">Opción 4: Planilla de Facturas de Cristian</span>
                  <ArrowRight className="w-4 h-4 text-primary-gold" />
                </button>
                <button
                  id="export-tab-full-btn"
                  onClick={() => handleExportTabSummary(10)}
                  className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-950 dark:bg-primary-gold text-white dark:text-slate-950 rounded-lg text-xs font-bold text-left cursor-pointer"
                >
                  <span>Exportar Base de Datos Completa (Todas juntas)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- BACKUP MODAL --- */}
      {backupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-350 dark:border-slate-700 animate-fade-in text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary-gold" />
                <h3 className="font-bold text-base font-display">Copia de Seguridad y Restauración</h3>
              </div>
              <button 
                onClick={() => setBackupModalOpen(false)} 
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {importNotice && (
                <div className={`p-3 text-xs rounded-lg border ${
                  importNotice.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border-rose-200'
                }`}>
                  {importNotice.msg}
                </div>
              )}

              {/* Action 1: Export Backup file */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 border border-slate-205 dark:border-slate-800">
                <h4 className="font-bold text-xs">1. Descargar copia de seguridad local</h4>
                <p className="text-[11px] text-slate-500">
                  Descarga un archivo JSON cifrado con todas las facturas y claves de contraseña configuradas para guardarlo en un pendrive o disco duro.
                </p>
                <button
                  id="backup-download-btn"
                  onClick={() => exportBackup(invoices, settings)}
                  className="w-full py-2 bg-slate-950 dark:bg-primary-gold text-white dark:text-slate-950 hover:bg-slate-950 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  <Download className="w-4 h-4" />
                  Descargar Respaldo (.json)
                </button>
              </div>

              {/* Action 2: Import Backup file */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 border border-slate-205 dark:border-slate-800">
                <h4 className="font-bold text-xs">2. Restaurar Copia de Seguridad</h4>
                <p className="text-[11px] text-slate-500">
                  Suba un archivo previamente descargado para reemplazar los datos del sistema con su copia guardada.
                </p>
                
                <input
                  id="backup-import-file-selector"
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleImportBackup}
                  className="hidden"
                />

                <button
                  id="backup-upload-trigger-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 border border-dashed border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  <FolderOpen className="w-4 h-4 text-primary-gold" />
                  Seleccionar Archivo de Resguardo JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
