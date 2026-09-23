/// <reference types="vite/client" />

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

export interface ElectronDownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface ElectronUpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | string[];
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>;
  startDownloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  quitAndInstall: () => Promise<void>;
  onCheckingForUpdate: (callback: () => void) => () => void;
  onUpdateAvailable: (callback: (info: ElectronUpdateInfo) => void) => () => void;
  onUpdateNotAvailable: (callback: (info: { version?: string }) => void) => () => void;
  onDownloadProgress: (callback: (progress: ElectronDownloadProgress) => void) => () => void;
  onUpdateDownloaded: (callback: (info: ElectronUpdateInfo) => void) => () => void;
  onUpdateError: (callback: (err: { message: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

