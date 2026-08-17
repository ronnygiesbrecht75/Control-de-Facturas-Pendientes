/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDocs
} from './firebase';
import { Invoice, Client, UserSettings, UserAccount } from '../types';

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
