/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Client } from '../types';
import { Users, UserPlus, Search, Trash2, ArrowLeft, ArrowRight, Check, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { lookupRucParaguay, formatRuc } from '../utils/rucService';

interface ClientesProps {
  clients: Client[];
  onAddClient: (name: string, ruc?: string) => boolean | string;
  onDeleteClient: (id: string) => void;
}

export default function Clientes({ clients, onAddClient, onDeleteClient }: ClientesProps) {
  const clientInputRef = useRef<HTMLInputElement>(null);
  const rucInputRef = useRef<HTMLInputElement>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientRuc, setNewClientRuc] = useState('');
  const [isSearchingRuc, setIsSearchingRuc] = useState(false);
  const [rucSuccessMsg, setRucSuccessMsg] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const itemsPerPage = 12;

  // Next automatic code starting from 1 and incrementing
  const nextCode = clients.reduce((max, c) => Math.max(max, typeof c.code === 'number' ? c.code : 0), 0) + 1;

  useEffect(() => {
    clientInputRef.current?.focus();
  }, []);

  const handleLookupRuc = async () => {
    const rawRuc = newClientRuc.trim();
    if (!rawRuc) {
      setNotification({ type: 'error', msg: 'Ingrese un número de RUC o C.I. para realizar la búsqueda.' });
      rucInputRef.current?.focus();
      return;
    }

    setIsSearchingRuc(true);
    setRucSuccessMsg(null);

    try {
      const result = await lookupRucParaguay(rawRuc);
      if (result.success && result.razonSocial) {
        setNewClientName(result.razonSocial);
        if (result.ruc) {
          setNewClientRuc(result.ruc);
        }
        setRucSuccessMsg(`✓ Encontrado: ${result.razonSocial} (${result.estado || 'Activo'})`);
        setNotification({ 
          type: 'success', 
          msg: `Datos cargados desde la SET/DNIT: "${result.razonSocial}".` 
        });
        setTimeout(() => clientInputRef.current?.focus(), 50);
      } else {
        setNotification({ 
          type: 'error', 
          msg: result.error || 'No se encontró ningún contribuyente con ese RUC.' 
        });
      }
    } catch {
      setNotification({ type: 'error', msg: 'Error de conexión al consultar el RUC.' });
    } finally {
      setIsSearchingRuc(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newClientName.trim();
    const cleanRuc = newClientRuc.trim() ? formatRuc(newClientRuc.trim()) : undefined;

    if (!cleanName) {
      setNotification({ type: 'error', msg: 'El nombre del cliente no puede estar vacío.' });
      clientInputRef.current?.focus();
      return;
    }

    const result = onAddClient(cleanName, cleanRuc);
    if (result === true) {
      setNotification({ 
        type: 'success', 
        msg: `Cliente "${cleanName}" registrado con código #${nextCode}${cleanRuc ? ` y RUC ${cleanRuc}` : ''}.` 
      });
      setNewClientName('');
      setNewClientRuc('');
      setRucSuccessMsg(null);
    } else if (typeof result === 'string') {
      setNotification({ type: 'error', msg: result });
    } else {
      setNotification({ type: 'error', msg: 'El cliente ya se encuentra registrado.' });
    }

    // Refocus the input field for continuous entry
    setTimeout(() => {
      clientInputRef.current?.focus();
    }, 50);

    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Filter clients based on name, code, or RUC (case insensitive)
  const filteredClients = clients.filter(client => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const matchesName = client.name.toLowerCase().includes(term);
    const matchesCode = typeof client.code === 'number' && client.code.toString().includes(term);
    const matchesRuc = client.ruc ? client.ruc.toLowerCase().includes(term) : false;
    return matchesName || matchesCode || matchesRuc;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 rounded-2xl text-slate-950 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 text-amber-400 p-2.5 rounded-xl shadow-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black font-display tracking-tight text-slate-950">
              Base de Datos de Clientes
            </h2>
            <p className="text-xs font-bold text-slate-900/80">
              Administre clientes y RUC de Comercial Walter con buscador oficial SET/DNIT
            </p>
          </div>
        </div>
        <div className="bg-white/20 backdrop-blur-xs py-1.5 px-4 rounded-full border border-white/10 font-mono text-xs font-bold">
          Total: {clients.length} Clientes
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-2.5 text-sm border animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40' 
            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/40'
        }`}>
          {notification.type === 'success' ? (
            <Check className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          )}
          <span className="font-semibold">{notification.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* REGISTER CLIENT FORM (LEFT PANEL - col-span-5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <UserPlus className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold font-display uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Registrar Nuevo Cliente
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 block">
                  Próximo Código a Asignar
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  Generado automático secuencial
                </span>
              </div>
              <span className="font-mono text-sm font-black px-2.5 py-1 bg-amber-500 text-slate-950 rounded-lg shadow-xs">
                #{nextCode}
              </span>
            </div>

            {/* RUC / CI Search Box */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider" htmlFor="client-ruc-input">
                  RUC / C.I. (Opcional)
                </label>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Auto-completar
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  id="client-ruc-input"
                  ref={rucInputRef}
                  type="text"
                  value={newClientRuc}
                  onChange={(e) => {
                    setNewClientRuc(e.target.value);
                    setRucSuccessMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupRuc();
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs font-bold"
                  placeholder="Ej. 80003000-1 ó 1234567"
                />

                <button
                  type="button"
                  onClick={handleLookupRuc}
                  disabled={isSearchingRuc}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Consultar RUC en el padrón SET/DNIT"
                >
                  {isSearchingRuc ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Buscar</span>
                </button>
              </div>

              {rucSuccessMsg && (
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in">
                  {rucSuccessMsg}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5" htmlFor="client-input">
                Nombre del Cliente / Razón Social
              </label>
              <input
                id="client-input"
                ref={clientInputRef}
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-sm"
                placeholder="Ej. Comercial Cooperativa Sommerfeld"
                required
              />
            </div>

            <button
              id="submit-new-client-btn"
              type="submit"
              className="w-full py-2.5 bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold rounded-xl shadow-sm transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              Guardar Cliente (#{nextCode})
            </button>
          </form>
        </div>

        {/* CLIENTS LIST TABLE (RIGHT PANEL - col-span-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold font-display uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Lista de Clientes Registrados
              </h3>
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, cód. o RUC..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th scope="col" className="py-2 px-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-16">
                    Cód.
                  </th>
                  <th scope="col" className="py-2 px-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Nombre del Cliente
                  </th>
                  <th scope="col" className="py-2 px-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-32">
                    RUC / C.I.
                  </th>
                  <th scope="col" className="py-2 px-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-24">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-700 bg-white dark:bg-slate-800">
                {paginatedClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                      No se encontraron clientes que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          #{client.code || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {client.name}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {client.ruc ? (
                          <span className="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                            {client.ruc}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => setClientToDelete(client)}
                          className="py-1 px-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-700 dark:hover:text-rose-300 transition-all text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="Eliminar Cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredClients.length)} de {filteredClients.length}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer disabled:cursor-not-allowed transition-all"
                  title="Página Anterior"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 px-2">
                  Pág. {currentPage} de {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer disabled:cursor-not-allowed transition-all"
                  title="Página Siguiente"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Client Deletion */}
      <ConfirmModal
        isOpen={!!clientToDelete}
        title="¿Eliminar Cliente?"
        message={
          clientToDelete
            ? `¿Desea eliminar a "${clientToDelete.name}" (Cód. #${clientToDelete.code || '-'}) del directorio de clientes?`
            : ''
        }
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (clientToDelete) {
            onDeleteClient(clientToDelete.id);
            setNotification({ type: 'success', msg: `Cliente "${clientToDelete.name}" eliminado correctamente.` });
            setClientToDelete(null);
            setTimeout(() => setNotification(null), 3000);
          }
        }}
        onClose={() => setClientToDelete(null)}
      />
    </div>
  );
}
