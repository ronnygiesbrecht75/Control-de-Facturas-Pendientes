import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

// Configure autoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater(win) {
  autoUpdater.on('checking-for-update', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('checking-for-update');
    }
  });

  autoUpdater.on('update-available', (info) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-not-available', {
        version: info?.version,
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
      });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('Error in autoUpdater:', err);
    if (win && !win.isDestroyed()) {
      let rawMsg = (err == null ? 'Error desconocido al actualizar' : (err.message || err)).toString();
      let friendly = rawMsg;
      if (rawMsg.includes('Please check update first')) {
        friendly = 'Por favor verifica primero las actualizaciones con el servidor antes de iniciar la descarga.';
      } else if (rawMsg.includes('latest.yml') || rawMsg.includes('404')) {
        friendly = 'No se encontró el manifiesto de actualización (latest.yml) en GitHub Releases. Utiliza el botón de descarga manual del instalador (.exe).';
      } else if (rawMsg.includes('dev-app-update.yml')) {
        friendly = 'El actualizador automático en 1 clic opera en la versión instalada (.exe). Puedes descargar el instalador directamente.';
      }
      win.webContents.send('update-error', {
        message: friendly,
      });
    }
  });
}

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    console.error('Error checking for updates:', error);
    return { success: false, error: error?.message || 'Error al comprobar actualizaciones en GitHub' };
  }
});

ipcMain.handle('start-download-update', async () => {
  try {
    // electron-updater requiere que checkForUpdates() se haya ejecutado previamente para inicializar el contexto de descarga
    await autoUpdater.checkForUpdates();
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('Error downloading update:', error);
    return { success: false, error: error?.message || 'Error al descargar la actualización' };
  }
});

ipcMain.handle('quit-and-install', () => {
  // Silent is false, isForceRunAfter is true so the app starts immediately after update
  autoUpdater.quitAndInstall(false, true);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Control de Pagos',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.cjs'),
    },
  });

  setupAutoUpdater(mainWindow);

  // Load the built index.html from dist
  mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Hide default menu bar (can be toggled on with Alt)
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
