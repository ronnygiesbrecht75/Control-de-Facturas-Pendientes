/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Invoice, InvoiceCategory, Client } from '../types';
import { formatPYG, formatInvoiceNumber } from '../utils/mockData';
import { PlusCircle, Info, FileText, Check, ChevronDown, Search, Users, X, Loader2, Sparkles } from 'lucide-react';
import { lookupRucParaguay, formatRuc } from '../utils/rucService';

interface RegistrarFacturaProps {
  onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  systemDate: string;
  clients?: Client[];
}

export default function RegistrarFactura({ onAddInvoice, systemDate, clients = [] }: RegistrarFacturaProps) {
  // Input references for sequential Enter navigation
  const clientCodeInputRef = useRef<HTMLInputElement>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);
  const searchModalInputRef = useRef<HTMLInputElement>(null);
  const modalListRef = useRef<HTMLDivElement>(null);

  const sucursalInputRef = useRef<HTMLInputElement>(null);
  const cajaInputRef = useRef<HTMLInputElement>(null);
  const numeroInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const termsInputRef = useRef<HTMLInputElement>(null);
  const pagoSelectRef = useRef<HTMLSelectElement>(null);
  const paidAmountInputRef = useRef<HTMLInputElement>(null);
  const paymentDateInputRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // Local state for the register form
  const [category, setCategory] = useState<InvoiceCategory>('Facturas');
  const [clientCode, setClientCode] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientRuc, setClientRuc] = useState<string>('');
  const [isSearchingRuc, setIsSearchingRuc] = useState<boolean>(false);
  const [rucSuccessMsg, setRucSuccessMsg] = useState<string | null>(null);
  const clientRucInputRef = useRef<HTMLInputElement>(null);
  
  // Client search modal state (F5)
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [modalSearchTerm, setModalSearchTerm] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Paraguay invoice number components
  const [sucursal, setSucursal] = useState('001');
  const [caja, setCaja] = useState('009');
  const [numero, setNumero] = useState('');
  
  const [amount, setAmount] = useState<number>(0);
  const [invoiceDate, setInvoiceDate] = useState(systemDate);
  const [terms, setTerms] = useState<number>(0);
  const [paid, setPaid] = useState<boolean>(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(systemDate);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync dates when system date changes
  useEffect(() => {
    setInvoiceDate(systemDate);
    setPaymentDate(systemDate);
  }, [systemDate]);

  // Adjust paid amount when "paid" toggle is enabled
  useEffect(() => {
    if (paid && paidAmount === 0) {
      setPaidAmount(amount);
    }
  }, [paid, amount]);

  // Global F5 key listener to open the client search modal and prevent browser reload
  useEffect(() => {
    const handleGlobalF5 = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        openSearchModal();
      }
    };
    window.addEventListener('keydown', handleGlobalF5, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalF5, true);
    };
  }, []);

  // Filter clients inside the F5 search modal
  const modalFilteredClients = clients.filter((c) => {
    const term = modalSearchTerm.trim().toLowerCase();
    if (!term) return true;
    const matchName = c.name.toLowerCase().includes(term);
    const matchCode = typeof c.code === 'number' && c.code.toString().includes(term);
    const matchRuc = c.ruc ? c.ruc.toLowerCase().includes(term) : false;
    return matchName || matchCode || matchRuc;
  });

  // Reset highlight index when search term changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [modalSearchTerm]);

  const openSearchModal = () => {
    setModalSearchTerm('');
    setHighlightedIndex(0);
    setShowSearchModal(true);
    setTimeout(() => {
      searchModalInputRef.current?.focus();
      searchModalInputRef.current?.select();
    }, 50);
  };

  const selectClient = (c: Client) => {
    setClientCode(typeof c.code === 'number' ? String(c.code) : '');
    setClientName(c.name);
    setClientRuc(c.ruc || '');
    setRucSuccessMsg(c.ruc ? `✓ RUC: ${c.ruc}` : null);
    setShowSearchModal(false);
    setNotification(null);
    setTimeout(() => {
      sucursalInputRef.current?.focus();
      sucursalInputRef.current?.select();
    }, 50);
  };

  const handleLookupRuc = async () => {
    const rawRuc = clientRuc.trim();
    if (!rawRuc) {
      setNotification({
        type: 'error',
        message: 'Ingrese un número de RUC o C.I. para realizar la búsqueda automática.'
      });
      clientRucInputRef.current?.focus();
      return;
    }

    // 1. Check if client already exists in local list
    const cleanNum = rawRuc.replace(/[^\d-]/g, '');
    const foundExisting = clients.find(c => c.ruc && c.ruc.replace(/[^\d-]/g, '') === cleanNum);
    if (foundExisting) {
      setClientName(foundExisting.name);
      setClientCode(foundExisting.code ? String(foundExisting.code) : '');
      setClientRuc(foundExisting.ruc || rawRuc);
      setRucSuccessMsg(`✓ Cliente en lista local: ${foundExisting.name}`);
      setNotification({
        type: 'success',
        message: `Cliente encontrado: "${foundExisting.name}" (Cód. #${foundExisting.code || '-'}).`
      });
      sucursalInputRef.current?.focus();
      sucursalInputRef.current?.select();
      return;
    }

    setIsSearchingRuc(true);
    setRucSuccessMsg(null);
    try {
      const res = await lookupRucParaguay(rawRuc);
      if (res.success && res.razonSocial) {
        setClientName(res.razonSocial);
        if (res.ruc) setClientRuc(res.ruc);
        setRucSuccessMsg(`✓ SET/DNIT: ${res.razonSocial} (${res.estado || 'Activo'})`);
        setNotification({
          type: 'success',
          message: `Razón Social obtenida de la SET/DNIT: "${res.razonSocial}".`
        });
        setTimeout(() => {
          sucursalInputRef.current?.focus();
          sucursalInputRef.current?.select();
        }, 50);
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'No se encontró el RUC en el padrón tributario.'
        });
      }
    } catch {
      setNotification({ type: 'error', message: 'Error de red al consultar el RUC.' });
    } finally {
      setIsSearchingRuc(false);
    }
  };

  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, modalFilteredClients.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (modalFilteredClients.length > 0) {
        const target = modalFilteredClients[highlightedIndex] || modalFilteredClients[0];
        if (target) selectClient(target);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSearchModal(false);
      setTimeout(() => {
        clientCodeInputRef.current?.focus();
        clientCodeInputRef.current?.select();
      }, 50);
    }
  };

  // Handle Enter on Client Code Input
  const handleClientCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = clientCode.trim();
      if (!val) {
        if (clientName.trim()) {
          sucursalInputRef.current?.focus();
          sucursalInputRef.current?.select();
        } else {
          setNotification({
            type: 'error',
            message: 'Ingrese el código del cliente o presione [F5] para buscar.'
          });
        }
        return;
      }

      const codeNum = parseInt(val, 10);
      const found = clients.find((c) => c.code === codeNum);
      if (found) {
        setClientName(found.name);
        setClientCode(String(found.code));
        setClientRuc(found.ruc || '');
        setRucSuccessMsg(found.ruc ? `✓ RUC: ${found.ruc}` : null);
        setNotification(null);
        sucursalInputRef.current?.focus();
        sucursalInputRef.current?.select();
      } else {
        setNotification({
          type: 'error',
          message: `El código #${val} no existe en clientes. Presione [F5] para buscar.`
        });
      }
    } else if (e.key === 'F5') {
      e.preventDefault();
      e.stopPropagation();
      openSearchModal();
    }
  };

  const handleClientNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!clientCode && clientName.trim()) {
        const found = clients.find((c) => c.name.toLowerCase() === clientName.trim().toLowerCase());
        if (found && typeof found.code === 'number') {
          setClientCode(String(found.code));
        }
      }
      sucursalInputRef.current?.focus();
      sucursalInputRef.current?.select();
    } else if (e.key === 'F5') {
      e.preventDefault();
      e.stopPropagation();
      openSearchModal();
    }
  };

  // Helper for sequential Enter key navigation
  const handleKeyDownNext = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextRef: React.RefObject<HTMLInputElement | HTMLButtonElement | null>,
    selectContent: boolean = false
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef.current) {
        nextRef.current.focus();
        if (
          selectContent && 
          'select' in nextRef.current && 
          typeof nextRef.current.select === 'function' &&
          (nextRef.current as HTMLInputElement).type !== 'date'
        ) {
          (nextRef.current as HTMLInputElement).select();
        }
      }
    }
  };

  const handleTermsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      pagoSelectRef.current?.focus();
    }
  };

  const handlePagoKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === '1' || e.key.toLowerCase() === 's') {
      e.preventDefault();
      setPaid(true);
      if (paidAmount === 0 && amount > 0) {
        setPaidAmount(amount);
      }
    } else if (e.key === '2' || e.key.toLowerCase() === 'n') {
      e.preventDefault();
      setPaid(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const isCurrentlyPaid = paid || e.currentTarget.value === '1';
      if (isCurrentlyPaid) {
        if (!paid) {
          setPaid(true);
          if (paidAmount === 0 && amount > 0) {
            setPaidAmount(amount);
          }
        }
        // Si el pago es Sí, pasar primero al cuadro de monto de pago
        setTimeout(() => {
          if (paidAmountInputRef.current) {
            paidAmountInputRef.current.focus();
            paidAmountInputRef.current.select();
          }
        }, 40);
      } else {
        // Si el pago es No, pasar directamente al botón guardar factura registrada
        submitBtnRef.current?.focus();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      setNotification({ type: 'error', message: 'Por favor, ingrese el código del cliente o selecciónelo con F5.' });
      clientCodeInputRef.current?.focus();
      return;
    }

    if (!numero.trim()) {
      setNotification({ type: 'error', message: 'Por favor, ingrese el número de factura.' });
      numeroInputRef.current?.focus();
      return;
    }

    if (amount <= 0) {
      setNotification({ type: 'error', message: 'El monto facturado debe ser mayor a cero.' });
      amountInputRef.current?.focus();
      return;
    }

    // Pad values
    const cleanSucursal = sucursal.padStart(3, '0').substring(0, 3);
    const cleanCaja = caja.padStart(3, '0').substring(0, 3);
    const cleanNumero = numero.padStart(7, '0').substring(0, 7);

    const newInvoice: Omit<Invoice, 'id'> = {
      category,
      clientName: clientName.trim(),
      clientCode: clientCode ? parseInt(clientCode, 10) : undefined,
      clientRuc: clientRuc.trim() ? formatRuc(clientRuc.trim()) : undefined,
      sucursal: cleanSucursal,
      caja: cleanCaja,
      numero: cleanNumero,
      amount,
      invoiceDate,
      terms: terms || 0,
      paid,
      ...(paid ? { paidAmount: paidAmount || amount, paymentDate } : {})
    };

    onAddInvoice(newInvoice);

    // Reset fields for the next entry
    setClientCode('');
    setClientName('');
    setClientRuc('');
    setRucSuccessMsg(null);
    setNumero('');
    setAmount(0);
    setTerms(0);
    setPaid(false);
    setPaidAmount(0);
    setNotification({ type: 'success', message: '¡Factura registrada exitosamente!' });

    // Instantly refocus the very first field ("Código del Cliente") to start next entry with Enter
    setTimeout(() => {
      clientCodeInputRef.current?.focus();
      clientCodeInputRef.current?.select();
    }, 50);

    // Clear notification after 4 seconds
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Focus the first input field on component load
  useEffect(() => {
    clientCodeInputRef.current?.focus();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Banner header styles */}
        <div className="bg-primary-gold p-5 text-slate-950 flex items-center gap-3">
          <PlusCircle className="w-6 h-6 text-slate-950" />
          <div>
            <h2 className="text-xl font-bold font-display">Registrar Nueva Factura</h2>
            <p className="text-xs font-semibold opacity-85">Cargue los documentos de facturación al sistema</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {notification && (
            <div className={`p-4 rounded-lg flex items-center gap-2 text-sm border ${
              notification.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40' 
                : 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
            }`}>
              <Info className="w-5 h-5 flex-shrink-0" />
              <span>{notification.message}</span>
            </div>
          )}

          {/* Form Selector for Category - compact dropdown with arrow */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="category-select">
              Destino de Factura (Categoría)
            </label>
            <div className="relative max-w-md">
              <select
                id="category-select"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as InvoiceCategory);
                  clientCodeInputRef.current?.focus();
                }}
                className="w-full appearance-none pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
              >
                <option value="Facturas">Facturas</option>
                <option value="Otras">Otras Facturas</option>
                <option value="Cristian">Facturas de Cristian</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-amber-600 dark:text-amber-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Código y Nombre del Cliente con soporte F5 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor="client-code-input">
                  Cliente
                </label>
                <button
                  type="button"
                  onClick={openSearchModal}
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 inline-flex items-center gap-1.5 cursor-pointer bg-amber-100/70 dark:bg-amber-950/50 hover:bg-amber-200/70 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-800 transition-colors"
                  title="Buscar cliente por nombre o código (F5)"
                >
                  <Search className="w-3 h-3" />
                  <span>Buscar</span>
                  <span className="font-mono text-[9px] font-black bg-amber-500 text-slate-950 px-1 py-0.2 rounded shadow-xs">
                    F5
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                {/* Cuadro chico para el código de cliente */}
                <div className="col-span-4 sm:col-span-3">
                  <input
                    id="client-code-input"
                    ref={clientCodeInputRef}
                    type="text"
                    inputMode="numeric"
                    value={clientCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setClientCode(val);
                      if (val) {
                        const found = clients.find(c => c.code === Number(val));
                        if (found) {
                          setClientName(found.name);
                          setClientRuc(found.ruc || '');
                          setRucSuccessMsg(found.ruc ? `✓ RUC: ${found.ruc}` : null);
                        }
                      }
                    }}
                    onKeyDown={handleClientCodeKeyDown}
                    className="w-full text-center px-2 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-mono font-black text-sm"
                    placeholder="Cód."
                    title="Ingrese el código del cliente y presione Enter (o F5 para buscar)"
                  />
                </div>

                {/* Cuadro del nombre asignado al código */}
                <div className="col-span-8 sm:col-span-9">
                  <input
                    id="client-name"
                    ref={clientInputRef}
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    onKeyDown={handleClientNameKeyDown}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-medium text-sm"
                    placeholder="Nombre del cliente o Razón Social"
                    required
                  />
                </div>
              </div>

              {/* Buscador de RUC Paraguay */}
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                <input
                  id="invoice-client-ruc"
                  ref={clientRucInputRef}
                  type="text"
                  value={clientRuc}
                  onChange={(e) => {
                    setClientRuc(e.target.value);
                    setRucSuccessMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupRuc();
                    }
                  }}
                  className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs font-bold"
                  placeholder="RUC / C.I. (Opcional - ej. 80003000-1)"
                  title="Ingrese RUC y presione Enter o Buscar para autocompletar la Razón Social"
                />
                <button
                  type="button"
                  onClick={handleLookupRuc}
                  disabled={isSearchingRuc}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  title="Consultar RUC en el padrón SET/DNIT"
                >
                  {isSearchingRuc ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Buscar RUC</span>
                </button>
              </div>

              {rucSuccessMsg && (
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate animate-fade-in">
                  {rucSuccessMsg}
                </p>
              )}
            </div>

            {/* 2. N° de Factura tipo Paraguay */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                N° de Factura
              </label>
              <div className="grid grid-cols-12 gap-1 items-center">
                <input
                  id="sucursal-input"
                  ref={sucursalInputRef}
                  aria-label="N° de Sucursal"
                  type="text"
                  maxLength={3}
                  value={sucursal}
                  onChange={(e) => setSucursal(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleKeyDownNext(e, cajaInputRef, true)}
                  className="col-span-3 text-center px-2 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-mono font-bold"
                  placeholder="001"
                />
                <span className="col-span-1 text-center text-slate-400 font-bold">-</span>
                <input
                  id="caja-input"
                  ref={cajaInputRef}
                  aria-label="N° de Caja"
                  type="text"
                  maxLength={3}
                  value={caja}
                  onChange={(e) => setCaja(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleKeyDownNext(e, numeroInputRef, true)}
                  className="col-span-3 text-center px-2 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-mono font-bold"
                  placeholder="009"
                />
                <span className="col-span-1 text-center text-slate-400 font-bold">-</span>
                <input
                  id="numero-input"
                  ref={numeroInputRef}
                  aria-label="N° de Factura"
                  type="text"
                  maxLength={7}
                  value={numero}
                  onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleKeyDownNext(e, amountInputRef, true)}
                  className="col-span-4 text-center px-2 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-mono font-bold"
                  placeholder="0006501"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 3. Monto Facturado */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="amount-input">
                Monto Facturado (₲)
              </label>
              <input
                id="amount-input"
                ref={amountInputRef}
                type="text"
                inputMode="numeric"
                value={amount ? amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setAmount(raw ? parseInt(raw, 10) : 0);
                }}
                onKeyDown={(e) => handleKeyDownNext(e, dateInputRef)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-mono font-bold"
                placeholder="0"
                required
              />
            </div>

            {/* 4. Fecha de Factura */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="date-input">
                Fecha de Factura
              </label>
              <input
                id="date-input"
                ref={dateInputRef}
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                onKeyDown={(e) => handleKeyDownNext(e, termsInputRef, true)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-semibold text-sm"
                required
              />
            </div>

            {/* 5. Término / Plazo (Días) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="terms-input">
                Término / Plazo (Días)
              </label>
              <input
                id="terms-input"
                ref={termsInputRef}
                type="number"
                min={0}
                value={terms || ''}
                onChange={(e) => setTerms(Number(e.target.value))}
                onKeyDown={handleTermsKeyDown}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-gold font-bold"
                placeholder="0"
              />
            </div>

            {/* 6. Cuadro Pago con Flecha y códigos 1 (Sí) / 2 (No) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="pago-select">
                Pago
              </label>
              <div className="relative">
                <select
                  id="pago-select"
                  ref={pagoSelectRef}
                  value={paid ? '1' : '2'}
                  onChange={(e) => {
                    const isPaid = e.target.value === '1';
                    setPaid(isPaid);
                    if (isPaid && paidAmount === 0 && amount > 0) {
                      setPaidAmount(amount);
                    }
                  }}
                  onKeyDown={handlePagoKeyDown}
                  className={`w-full appearance-none pl-3 pr-8 py-2 rounded-lg border font-bold text-sm cursor-pointer shadow-xs focus:outline-none focus:ring-2 ${
                    paid
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 focus:ring-emerald-500'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 focus:ring-primary-gold'
                  }`}
                >
                  <option value="2">2 - No</option>
                  <option value="1">1 - Sí</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-500 dark:text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                1 = Sí &bull; 2 = No
              </p>
            </div>
          </div>

          {/* Opcional: Si está pagado, campos para monto liquidado o fecha de pago */}
          {paid && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="paid-amount-input">
                  Monto de Pago (Opcional)
                </label>
                <input
                  id="paid-amount-input"
                  ref={paidAmountInputRef}
                  type="text"
                  inputMode="numeric"
                  value={paidAmount ? paidAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setPaidAmount(raw ? parseInt(raw, 10) : 0);
                  }}
                  onKeyDown={(e) => handleKeyDownNext(e, paymentDateInputRef)}
                  className="w-full px-3.5 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" htmlFor="payment-date-input">
                  Fecha del Pago (Opcional)
                </label>
                <input
                  id="payment-date-input"
                  ref={paymentDateInputRef}
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  onKeyDown={(e) => handleKeyDownNext(e, submitBtnRef)}
                  className="w-full px-3.5 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              id="submit-register-invoice-btn"
              ref={submitBtnRef}
              type="submit"
              className="w-full py-3 bg-slate-900 dark:bg-primary-gold hover:bg-slate-950 dark:hover:bg-primary-gold-dark text-white dark:text-slate-950 font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-4 focus:ring-amber-500/50"
            >
              <PlusCircle className="w-5 h-5" />
              Guardar Factura Registrada
            </button>
          </div>

        </form>
      </div>

      {/* MODAL DIALOG: Búsqueda de Clientes (F5) */}
      {showSearchModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-search-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fade-in"
          onClick={() => {
            setShowSearchModal(false);
            setTimeout(() => clientCodeInputRef.current?.focus(), 50);
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-slate-950" />
                <div>
                  <h3 id="client-search-title" className="font-bold text-sm font-display tracking-tight text-slate-950">
                    Buscar Cliente
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-900/80">
                    Navegue con ↑ ↓ y presione Enter para seleccionar
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black bg-slate-950 text-amber-400 px-2 py-0.5 rounded-md shadow-xs">
                  F5
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchModal(false);
                    setTimeout(() => clientCodeInputRef.current?.focus(), 50);
                  }}
                  className="p-1 rounded-lg hover:bg-black/15 text-slate-950 transition-colors cursor-pointer"
                  title="Cerrar búsqueda (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Input Box */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  ref={searchModalInputRef}
                  type="text"
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  onKeyDown={handleModalKeyDown}
                  placeholder="Escriba código o nombre del cliente..."
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Results List */}
            <div ref={modalListRef} className="overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-700/50 flex-1">
              {modalFilteredClients.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                  No se encontraron clientes con "{modalSearchTerm}".
                </div>
              ) : (
                modalFilteredClients.map((client, index) => {
                  const isSelected = index === highlightedIndex;
                  return (
                    <div
                      key={client.id}
                      onClick={() => selectClient(client)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-100/90 dark:bg-amber-950/70 text-slate-950 dark:text-slate-100 border border-amber-300 dark:border-amber-700 shadow-xs'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 shrink-0">
                          #{client.code || '-'}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold block truncate">
                            {client.name}
                          </span>
                          {client.ruc && (
                            <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400 block">
                              RUC: {client.ruc}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 font-mono shrink-0 ml-2 bg-amber-200/60 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                          [Enter]
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Navigation Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span>{modalFilteredClients.length} cliente{modalFilteredClients.length === 1 ? '' : 's'}</span>
              <div className="flex items-center gap-3">
                <span><kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">↓</kbd> Navegar</span>
                <span><kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Enter</kbd> Seleccionar</span>
                <span><kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Esc</kbd> Salir</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
