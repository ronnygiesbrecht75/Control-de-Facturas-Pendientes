/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Client } from '../types';
import { Edit3, X, Save, Search, Sparkles, Loader2, Check, AlertCircle, Hash, Building2, FileText, RefreshCw } from 'lucide-react';
import { lookupRucParaguay, formatRuc } from '../utils/rucService';

interface EditClientModalProps {
  isOpen: boolean;
  client: Client | null;
  clients: Client[];
  onSave: (updatedClient: Client, updateInvoices: boolean) => boolean | string;
  onClose: () => void;
}

export default function EditClientModal({
  isOpen,
  client,
  clients,
  onSave,
  onClose
}: EditClientModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const rucInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState<number | string>('');
  const [ruc, setRuc] = useState('');
  const [updateInvoices, setUpdateInvoices] = useState(true);

  const [isSearchingRuc, setIsSearchingRuc] = useState(false);
  const [rucSuccessMsg, setRucSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state whenever client changes or modal opens
  useEffect(() => {
    if (client && isOpen) {
      setName(client.name || '');
      setCode(client.code !== undefined && client.code !== null ? client.code : '');
      setRuc(client.ruc || '');
      setUpdateInvoices(true);
      setErrorMsg(null);
      setRucSuccessMsg(null);
      
      // Auto-focus name input
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 80);
    }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  const handleLookupRuc = async () => {
    const rawRuc = ruc.trim();
    if (!rawRuc) {
      setErrorMsg('Ingrese un número de RUC o C.I. para realizar la consulta.');
      rucInputRef.current?.focus();
      return;
    }

    setIsSearchingRuc(true);
    setErrorMsg(null);
    setRucSuccessMsg(null);

    try {
      const result = await lookupRucParaguay(rawRuc);
      if (result.success && result.razonSocial) {
        setName(result.razonSocial);
        if (result.ruc) {
          setRuc(result.ruc);
        }
        setRucSuccessMsg(`✓ Encontrado: ${result.razonSocial} (${result.estado || 'Activo'})`);
        setTimeout(() => nameInputRef.current?.focus(), 50);
      } else {
        setErrorMsg(result.error || 'No se encontró ningún contribuyente con ese RUC en la base de datos de la SET/DNIT.');
      }
    } catch {
      setErrorMsg('Error de conexión al consultar el padrón del RUC.');
    } finally {
      setIsSearchingRuc(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('El nombre o razón social del cliente no puede estar vacío.');
      nameInputRef.current?.focus();
      return;
    }

    // Validate code
    let parsedCode: number | undefined = undefined;
    if (code !== '' && code !== null && code !== undefined) {
      const numCode = Number(code);
      if (isNaN(numCode) || numCode <= 0 || !Number.isInteger(numCode)) {
        setErrorMsg('El código del cliente debe ser un número entero positivo (ej: 1, 2, 3...).');
        return;
      }
      parsedCode = numCode;
    }

    const cleanRuc = ruc.trim() ? formatRuc(ruc.trim()) : undefined;

    const updatedClient: Client = {
      ...client,
      name: cleanName,
      code: parsedCode,
      ruc: cleanRuc
    };

    const result = onSave(updatedClient, updateInvoices);
    if (result !== true) {
      if (typeof result === 'string') {
        setErrorMsg(result);
      } else {
        setErrorMsg('No se pudo guardar la modificación del cliente.');
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-client-modal-title"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shadow-xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="edit-client-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                Editar Datos del Cliente
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Modifique la información y RUC de <span className="font-bold text-slate-700 dark:text-slate-200">{client.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ERROR NOTIFICATION */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" />
            <div className="font-semibold leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* EDIT FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* ROW: Client Code & RUC Query */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Sequential Code */}
            <div className="sm:col-span-4 space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-amber-500" />
                <span>Código #</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs font-bold"
              />
            </div>

            {/* RUC / CI Search */}
            <div className="sm:col-span-8 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>RUC / C.I.</span>
                </label>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Padrón SET
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  ref={rucInputRef}
                  type="text"
                  value={ruc}
                  onChange={(e) => {
                    setRuc(e.target.value);
                    setRucSuccessMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupRuc();
                    }
                  }}
                  placeholder="Ej. 80003000-1"
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={handleLookupRuc}
                  disabled={isSearchingRuc}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Consultar en el padrón SET/DNIT"
                >
                  {isSearchingRuc ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Buscar</span>
                </button>
              </div>
            </div>
          </div>

          {rucSuccessMsg && (
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-2 rounded-lg animate-fade-in">
              {rucSuccessMsg}
            </p>
          )}

          {/* Client Name / Business Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Nombre del Cliente / Razón Social *</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Cooperativa Sommerfeld"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-sm"
              required
            />
          </div>

          {/* Sync existing invoices checkbox */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={updateInvoices}
                onChange={(e) => setUpdateInvoices(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Actualizar facturas y remisiones existentes
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight block mt-0.5">
                  Actualiza automáticamente el nombre y RUC en todas las facturas y remisiones ya emitidas a nombre de este cliente.
                </span>
              </div>
            </label>
          </div>

          {/* FOOTER BUTTONS */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
