/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MicPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface MicPermissionDiagnosis {
  status: MicPermissionStatus;
  isInIframe: boolean;
  hasGetUserMedia: boolean;
  hasSpeechRecognition: boolean;
  hasMediaRecorder: boolean;
  errorMessage?: string;
  errorType?: 'not-allowed' | 'not-found' | 'security' | 'unsupported' | 'unknown';
}

/**
 * Detects if the current web app is embedded inside an iframe (e.g. AI Studio preview)
 */
export function isAppInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    // If accessing window.top throws a security error, it is definitely in a cross-origin iframe
    return true;
  }
}

/**
 * Checks the current microphone permission status if supported by the browser
 */
export async function checkMicrophonePermission(): Promise<MicPermissionStatus> {
  if (typeof navigator === 'undefined') return 'unsupported';

  // Check Permissions API
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return permissionStatus.state as MicPermissionStatus;
    } catch (err) {
      // Some browsers (e.g. Safari or older mobile browsers) do not support querying 'microphone'
    }
  }

  // If getUserMedia exists but permissions query is unsupported, return 'prompt'
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return 'prompt';
  }

  return 'unsupported';
}

/**
 * Solicits permission by explicitly requesting a microphone audio stream,
 * then immediately releases the stream.
 */
export async function requestMicrophoneAccess(): Promise<{
  granted: boolean;
  errorType?: 'not-allowed' | 'not-found' | 'security' | 'unsupported' | 'unknown';
  errorMessage?: string;
}> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      granted: false,
      errorType: 'unsupported',
      errorMessage: 'Tu navegador no soporta captura de audio o no está en un entorno seguro (HTTPS).'
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop all tracks immediately so the microphone does not stay active
    stream.getTracks().forEach((track) => track.stop());
    return { granted: true };
  } catch (err: any) {
    const errName = err.name || '';
    const errMsg = err.message || '';

    if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
      return {
        granted: false,
        errorType: 'not-allowed',
        errorMessage: 'El permiso de micrófono fue denegado o está bloqueado en el navegador.'
      };
    }

    if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
      return {
        granted: false,
        errorType: 'not-found',
        errorMessage: 'No se detectó ningún micrófono conectado en este dispositivo.'
      };
    }

    if (errName === 'SecurityError') {
      return {
        granted: false,
        errorType: 'security',
        errorMessage: 'El navegador bloqueó el micrófono por políticas de seguridad (marco integrado o HTTP).'
      };
    }

    return {
      granted: false,
      errorType: 'unknown',
      errorMessage: errMsg || 'Ocurrió un error al solicitar acceso al micrófono.'
    };
  }
}

/**
 * Diagnostic helper to understand the full audio environment
 */
export async function getAudioEnvironmentDiagnosis(): Promise<MicPermissionDiagnosis> {
  const isInIframe = isAppInIframe();
  const hasGetUserMedia = Boolean(typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia);
  const hasSpeechRecognition = Boolean(
    typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );
  const hasMediaRecorder = Boolean(typeof window !== 'undefined' && (window as any).MediaRecorder);

  const status = await checkMicrophonePermission();

  return {
    status,
    isInIframe,
    hasGetUserMedia,
    hasSpeechRecognition,
    hasMediaRecorder
  };
}

/**
 * Class to capture audio chunks with MediaRecorder and convert to base64 for Gemini AI
 */
export class AudioRecorderSession {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia no disponible');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioChunks = [];
    this.startTime = Date.now();

    // Select preferred mime type supported by browser
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      ''
    ];

    let selectedMimeType = '';
    if (typeof MediaRecorder !== 'undefined') {
      for (const mime of mimeTypes) {
        if (mime === '' || MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }
    }

    this.mediaRecorder = selectedMimeType
      ? new MediaRecorder(this.stream, { mimeType: selectedMimeType })
      : new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(250); // Slice every 250ms
  }

  stop(): Promise<{ base64: string; mimeType: string; blob: Blob; durationMs: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        return reject(new Error('La grabación no está activa.'));
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const blob = new Blob(this.audioChunks, { type: mimeType });
          const durationMs = Date.now() - this.startTime;

          // Clean up stream tracks
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }

          // Convert blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1] || '';
            resolve({
              base64,
              mimeType,
              blob,
              durationMs
            });
          };
          reader.onerror = (e) => reject(e);
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  abort(): void {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
    } catch (e) {
      // Ignore cleanup error
    }
  }
}
