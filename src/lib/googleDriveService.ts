/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { app } from './firebase';

export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));
// Force prompt to ensure refresh/account selection when requested
provider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token strictly in memory (NOT in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  mimeType?: string;
  description?: string;
  webViewLink?: string;
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User logged in to Firebase, but access token not yet cached in this memory session
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Drive.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      // User closed the popup or dismissed the window; return null gracefully
      return null;
    }
    console.warn('Sign in issue:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentGoogleUser = (): User | null => {
  return auth.currentUser;
};

export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

const FOLDER_NAME = 'Control de Pagos - Copias de Seguridad';

/**
 * Finds or creates a dedicated folder in Google Drive for the backups
 */
export const getOrCreateBackupFolder = async (accessToken: string): Promise<string> => {
  try {
    // Search for existing folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(FOLDER_NAME)}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id, name)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }

    // If not found, create new folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (createRes.ok) {
      const newFolder = await createRes.json();
      return newFolder.id;
    }
  } catch (e) {
    console.warn('Could not locate/create folder, saving in root Drive folder:', e);
  }

  return '';
};

/**
 * Uploads a JSON backup to Google Drive
 */
export const uploadBackupToGoogleDrive = async (
  backupPayload: any,
  customName?: string
): Promise<DriveBackupFile> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debe iniciar sesión con su cuenta de Google para guardar en Google Drive.');
  }

  const folderId = await getOrCreateBackupFolder(token);

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = customName || `respaldo_pagos_${dateStr}_${timeStr}.json`;

  const metadata: any = {
    name: filename,
    description: `Copia de seguridad del sistema de Facturas y Cobranzas generada el ${now.toLocaleString()}`,
    mimeType: 'application/json'
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(backupPayload, null, 2) +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size,mimeType,description',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Error al subir la copia de seguridad a Google Drive.');
  }

  const uploadedFile = await uploadRes.json();
  return {
    id: uploadedFile.id,
    name: uploadedFile.name,
    createdTime: uploadedFile.createdTime || now.toISOString(),
    size: uploadedFile.size,
    description: uploadedFile.description,
    webViewLink: uploadedFile.webViewLink
  };
};

/**
 * Uploads an Excel-compatible CSV summary sheet directly to Google Drive
 */
export const uploadSummaryToGoogleDrive = async (
  csvContent: string,
  filename: string,
  description?: string
): Promise<DriveBackupFile> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debe iniciar sesión con su cuenta de Google para guardar en Google Drive.');
  }

  const folderId = await getOrCreateBackupFolder(token);

  const metadata: any = {
    name: filename,
    description: description || `Reporte de facturas y pagos generado desde Control de Pagos`,
    mimeType: 'text/csv'
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  // Prepend UTF-8 BOM so Google Sheets and Excel recognize accents & Guaraníes symbols
  const BOM = '\uFEFF';
  const fullContent = BOM + csvContent;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/csv; charset=UTF-8\r\n\r\n' +
    fullContent +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Error al guardar el reporte en Google Drive.');
  }

  const uploadedFile = await uploadRes.json();
  return {
    id: uploadedFile.id,
    name: uploadedFile.name,
    createdTime: uploadedFile.createdTime || new Date().toISOString(),
    size: uploadedFile.size,
    description: uploadedFile.description,
    webViewLink: uploadedFile.webViewLink
  };
};

/**
 * Lists all backup files in Google Drive saved by this app
 */
export const listGoogleDriveBackups = async (): Promise<DriveBackupFile[]> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debe iniciar sesión con Google para ver las copias en la nube.');
  }

  const query = `name contains 'respaldo_pagos' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&fields=files(id,name,createdTime,size,mimeType,description)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Error al consultar las copias en Google Drive.');
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    createdTime: f.createdTime,
    size: f.size,
    mimeType: f.mimeType,
    description: f.description,
    webViewLink: f.webViewLink
  }));
};

/**
 * Lists all summary / CSV files in Google Drive saved by this app
 */
export const listGoogleDriveSummaries = async (): Promise<DriveBackupFile[]> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debe iniciar sesión con Google para ver los reportes en la nube.');
  }

  const query = `(name contains 'Reporte_' or name contains 'Planilla_' or name contains 'Control_De_Pagos' or mimeType='text/csv') and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&fields=files(id,name,createdTime,size,mimeType,description,webViewLink)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Error al consultar los resúmenes en Google Drive.');
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    createdTime: f.createdTime,
    size: f.size,
    mimeType: f.mimeType,
    description: f.description,
    webViewLink: f.webViewLink
  }));
};

/**
 * Downloads and parses backup JSON content from Google Drive
 */
export const downloadBackupContentFromDrive = async (fileId: string): Promise<any> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debe iniciar sesión con Google para descargar la copia.');
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error('No se pudo descargar el archivo de copia de seguridad desde Google Drive.');
  }

  return await res.json();
};

/**
 * Deletes a backup file from Google Drive (Requires user confirmation prior to calling!)
 */
export const deleteBackupFromDrive = async (fileId: string): Promise<void> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debe iniciar sesión con Google.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok && res.status !== 204) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Error al eliminar el archivo de Google Drive.');
  }
};
