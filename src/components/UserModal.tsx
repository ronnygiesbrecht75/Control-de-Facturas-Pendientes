/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserAccount, UserPermissions } from '../types';
import { TAB_LABELS, allPermissionsTrue } from '../utils/initialUsers';
import { UserPlus, Edit3, X, Save, CheckSquare, Square, Shield, Eye, EyeOff, User } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  userToEdit: UserAccount | null;
  existingUsers: UserAccount[];
  onSave: (user: UserAccount) => void;
  onClose: () => void;
}

export default function UserModal({
  isOpen,
  userToEdit,
  existingUsers,
  onSave,
  onClose
}: UserModalProps) {
  if (!isOpen) return null;

  const isEditing = !!userToEdit;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [permissions, setPermissions] = useState<UserPermissions>({ ...allPermissionsTrue });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (userToEdit) {
      setUsername(userToEdit.username);
      setPassword(userToEdit.passwordHash);
      setRole(userToEdit.role);
      setPermissions({ ...userToEdit.permissions });
    } else {
      setUsername('');
      setPassword('');
      setRole('user');
      setPermissions({
        'registrar-factura': false,
        'registrar-pagos': false,
        'cobro-movil': true,
        'facturas-pendientes': true,
        'facturas': false,
        'otras-facturas': false,
        'cristian-facturas': false,
        'clientes': false,
        'ajustes': false
      });
    }
    setErrorMsg(null);
  }, [userToEdit, isOpen]);

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectAll = () => {
    setPermissions({ ...allPermissionsTrue });
  };

  const handleDeselectAll = () => {
    setPermissions({
      'registrar-factura': false,
      'registrar-pagos': false,
      'cobro-movil': false,
      'facturas-pendientes': false,
      'facturas': false,
      'otras-facturas': false,
      'cristian-facturas': false,
      'clientes': false,
      'ajustes': false
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setErrorMsg('Por favor ingrese un nombre de usuario.');
      return;
    }

    if (!password) {
      setErrorMsg('Por favor ingrese una contraseña.');
      return;
    }

    // Check duplicate username if adding new or renaming
    const duplicate = existingUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.id !== userToEdit?.id
    );

    if (duplicate) {
      setErrorMsg(`El nombre de usuario "${cleanUsername}" ya existe.`);
      return;
    }

    const updatedUser: UserAccount = {
      id: userToEdit ? userToEdit.id : `user-${Date.now()}`,
      username: cleanUsername,
      passwordHash: password,
      role,
      permissions: role === 'admin' ? { ...allPermissionsTrue } : permissions,
      createdAt: userToEdit?.createdAt || new Date().toISOString().split('T')[0]
    };

    onSave(updatedUser);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl my-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl">
              {isEditing ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">
                {isEditing ? `Editar Usuario: ${userToEdit.username}` : 'Agregar Nuevo Usuario'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure el acceso y seleccione los permisos por pestaña.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nombre de Usuario
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. juan, repartidor1"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña del usuario"
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Rol
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  role === 'user'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-600" />
                  Usuario Estándar
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Acceso restringido únicamente a las pestañas seleccionadas.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-600" />
                  Administrador
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Acceso total a todas las pestañas y gestión de usuarios.
                </p>
              </button>
            </div>
          </div>

          {/* Permissions Checkboxes Section (Only if role === 'user') */}
          {role === 'user' ? (
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                  Permisos por Pestaña
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(TAB_LABELS) as Array<keyof UserPermissions>).map((tabKey) => {
                  const isChecked = permissions[tabKey];
                  return (
                    <label
                      key={tabKey}
                      onClick={() => handleTogglePermission(tabKey)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-800/60 text-slate-900 dark:text-slate-100 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent container click
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs">{TAB_LABELS[tabKey]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-xl font-medium">
              ✨ Los administradores tienen acceso completo a todas las pestañas automáticamente.
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer font-display"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
