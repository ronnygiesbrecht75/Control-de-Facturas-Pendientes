/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  db, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDocs,
  arrayUnion
} from './firebase';
import { Invoice, Client, UserSettings, UserAccount, AppLicense, LicenseValidationResult } from '../types';

// Helper to remove undefined fields which Firestore rejects
function sanitizeData<T extends object>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        clean[key] = sanitizeData(value as object);
      } else {
        clean[key] = value;
      }
    }
  });
  return clean;
}

// 1. INVOICES SYNC
export function subscribeInvoices(onUpdate: (invoices: Invoice[]) => void) {
  const invoicesRef = collection(db, 'invoices');
  return onSnapshot(invoicesRef, (snapshot) => {
    const list: Invoice[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Invoice);
    });
    // Sort by id / date descending
    onUpdate(list);
  }, (err) => {
    console.error('Error listening to invoices in Firestore:', err);
  });
}

export async function syncInvoiceToCloud(invoice: Invoice) {
  try {
    const docRef = doc(db, 'invoices', invoice.id);
    await setDoc(docRef, sanitizeData(invoice), { merge: true });
  } catch (e) {
    console.error('Failed to sync invoice to cloud:', e);
  }
}

export async function removeInvoiceFromCloud(id: string) {
  try {
    const docRef = doc(db, 'invoices', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Failed to remove invoice from cloud:', e);
  }
}

export async function removeAllInvoicesFromCloud() {
  try {
    const snapshot = await getDocs(collection(db, 'invoices'));
    const promises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(promises);
  } catch (e) {
    console.error('Failed to clear all invoices from cloud:', e);
  }
}

// 2. CLIENTS SYNC
export function subscribeClients(onUpdate: (clients: Client[]) => void) {
  const clientsRef = collection(db, 'clients');
  return onSnapshot(clientsRef, (snapshot) => {
    const list: Client[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Client);
    });
    onUpdate(list);
  }, (err) => {
    console.error('Error listening to clients in Firestore:', err);
  });
}

export async function syncClientToCloud(client: Client) {
  try {
    const docRef = doc(db, 'clients', client.id);
    await setDoc(docRef, sanitizeData(client), { merge: true });
  } catch (e) {
    console.error('Failed to sync client to cloud:', e);
  }
}

export async function removeClientFromCloud(id: string) {
  try {
    const docRef = doc(db, 'clients', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Failed to remove client from cloud:', e);
  }
}

export async function removeAllClientsFromCloud() {
  try {
    const snapshot = await getDocs(collection(db, 'clients'));
    const promises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(promises);
  } catch (e) {
    console.error('Failed to clear all clients from cloud:', e);
  }
}

// 3. SETTINGS SYNC
export function subscribeSettings(onUpdate: (settings: UserSettings) => void) {
  const docRef = doc(db, 'settings', 'user_settings');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as UserSettings);
    }
  }, (err) => {
    console.error('Error listening to settings in Firestore:', err);
  });
}

export async function syncSettingsToCloud(settings: UserSettings) {
  try {
    const docRef = doc(db, 'settings', 'user_settings');
    await setDoc(docRef, sanitizeData(settings), { merge: true });
  } catch (e) {
    console.error('Failed to sync settings to cloud:', e);
  }
}

// 4. USERS SYNC
export function subscribeUsers(onUpdate: (users: UserAccount[]) => void) {
  const usersRef = collection(db, 'users');
  return onSnapshot(usersRef, (snapshot) => {
    const list: UserAccount[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as UserAccount);
    });
    onUpdate(list);
  }, (err) => {
    console.error('Error listening to users in Firestore:', err);
  });
}

export async function syncUserToCloud(user: UserAccount) {
  try {
    const docRef = doc(db, 'users', user.id);
    await setDoc(docRef, sanitizeData(user), { merge: true });
  } catch (e) {
    console.error('Failed to sync user to cloud:', e);
  }
}

export async function removeUserFromCloud(id: string) {
  try {
    const docRef = doc(db, 'users', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Failed to remove user from cloud:', e);
  }
}

// 5. LICENSES VALIDATION & MANAGEMENT
// Cleans license input (removes spaces, trims, converts to uppercase)
export function normalizeLicenseKey(rawKey: string): string {
  return rawKey.trim().toUpperCase().replace(/\s+/g, '');
}

// Generates or retrieves a persistent unique Device ID for this installation
export function getOrCreateDeviceId(): string {
  const STORAGE_KEY = 'pagos_app_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId = regenerateDeviceId();
  }
  return deviceId;
}

// Forces generation of a brand new unique device ID for this installation
export function regenerateDeviceId(): string {
  const STORAGE_KEY = 'pagos_app_device_id';
  const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const platformTag = isMobile ? 'MOB' : 'PC';
  const newDeviceId = `${platformTag}-${randomHex}-${Date.now().toString().slice(-4)}`;
  localStorage.setItem(STORAGE_KEY, newDeviceId);
  return newDeviceId;
}

// Validates a license key against Firebase Firestore
export async function validateLicenseInFirebase(licenseKey: string): Promise<LicenseValidationResult> {
  const normalizedKey = normalizeLicenseKey(licenseKey);
  if (!normalizedKey) {
    return { valid: false, message: 'Por favor, ingrese una clave de licencia válida.' };
  }

  try {
    const docRef = doc(db, 'licenses', normalizedKey);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { 
        valid: false, 
        message: 'La clave de licencia ingresada no existe o no fue encontrada en el servidor.' 
      };
    }

    const licenseData = docSnap.data() as AppLicense;

    // Check if license is active
    if (licenseData.active === false) {
      return { 
        valid: false, 
        message: 'Esta licencia se encuentra desactivada o suspendida. Contacte al administrador.' 
      };
    }

    // Check expiration date if configured
    if (licenseData.expiresAt && licenseData.expiresAt !== 'permanente') {
      const today = new Date().toISOString().split('T')[0];
      if (licenseData.expiresAt < today) {
        return { 
          valid: false, 
          message: `Esta licencia ha expirado el ${licenseData.expiresAt}. Por favor renuévela.` 
        };
      }
    }

    // Register current device if not already listed
    const currentDeviceId = getOrCreateDeviceId();
    const activatedDevices = Array.isArray(licenseData.activatedDevices) ? [...licenseData.activatedDevices] : [];
    
    if (!activatedDevices.includes(currentDeviceId)) {
      if (licenseData.maxDevices && activatedDevices.length >= licenseData.maxDevices) {
        return {
          valid: false,
          message: `Límite de dispositivos excedido (${activatedDevices.length}/${licenseData.maxDevices}). No se pueden activar más equipos con esta licencia.`
        };
      }
      activatedDevices.push(currentDeviceId);
      // Update in Firebase atomically using arrayUnion
      await setDoc(docRef, { activatedDevices: arrayUnion(currentDeviceId) }, { merge: true });
      licenseData.activatedDevices = activatedDevices;
    }

    return {
      valid: true,
      message: `Licencia válida para: ${licenseData.assignedTo || 'Cliente Autorizado'}`,
      license: licenseData
    };
  } catch (err: any) {
    console.error('Error validating license in Firebase:', err);
    return {
      valid: false,
      isNetworkError: true,
      message: `Error al conectar con el servidor de licencias: ${err?.message || 'Verifique su conexión a internet.'}`
    };
  }
}

// Subscribes to changes in a specific license (so if an admin deactivates it remotely, the app blocks immediately)
export function subscribeToLicense(licenseKey: string, onUpdate: (license: AppLicense | null) => void) {
  const normalizedKey = normalizeLicenseKey(licenseKey);
  if (!normalizedKey) return () => {};

  const docRef = doc(db, 'licenses', normalizedKey);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as AppLicense);
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.error('Error listening to license status:', err);
  });
}

// Helper to seed or save a license in Firebase (for admin settings)
export async function saveLicenseToCloud(license: AppLicense) {
  try {
    const normalizedKey = normalizeLicenseKey(license.key);
    const docRef = doc(db, 'licenses', normalizedKey);
    await setDoc(docRef, sanitizeData({ ...license, key: normalizedKey }), { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to save license to cloud:', e);
    return false;
  }
}

// Subscribes to all licenses created in Firebase (for developer management panel)
export function subscribeAllLicenses(onUpdate: (licenses: AppLicense[]) => void) {
  const licensesRef = collection(db, 'licenses');
  return onSnapshot(licensesRef, (snapshot) => {
    const list: AppLicense[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as AppLicense);
    });
    // Sort by creation or name
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    onUpdate(list);
  }, (err) => {
    console.error('Error fetching all licenses from Firestore:', err);
  });
}

// Deactivates or activates a license remotely in Firebase
export async function toggleLicenseActiveStatus(licenseKey: string, active: boolean) {
  try {
    const normalizedKey = normalizeLicenseKey(licenseKey);
    const docRef = doc(db, 'licenses', normalizedKey);
    await setDoc(docRef, { active }, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to toggle license active status:', e);
    return false;
  }
}

// Resets/clears registered device IDs so client can re-activate on other devices
export async function clearLicenseRegisteredDevices(licenseKey: string) {
  try {
    const normalizedKey = normalizeLicenseKey(licenseKey);
    const docRef = doc(db, 'licenses', normalizedKey);
    await setDoc(docRef, { activatedDevices: [] }, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to reset registered devices for license:', e);
    return false;
  }
}

// Permanently removes a license from Firestore
export async function deleteLicenseFromCloud(licenseKey: string) {
  try {
    const normalizedKey = normalizeLicenseKey(licenseKey);
    const docRef = doc(db, 'licenses', normalizedKey);
    await deleteDoc(docRef);
    return true;
  } catch (e) {
    console.error('Failed to delete license from cloud:', e);
    return false;
  }
}

// Removes a single device ID from a license in Firestore
export async function removeDeviceFromLicense(licenseKey: string, deviceIdToRemove: string) {
  try {
    const normalizedKey = normalizeLicenseKey(licenseKey);
    const docRef = doc(db, 'licenses', normalizedKey);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    const data = snap.data() as AppLicense;
    const current = Array.isArray(data.activatedDevices) ? data.activatedDevices : [];
    const updated = current.filter(id => id !== deviceIdToRemove);
    await setDoc(docRef, { activatedDevices: updated }, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to remove device from license:', e);
    return false;
  }
}
