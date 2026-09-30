/**
 * Mathreya Biometric & Passkey Authentication Bridge
 *
 * Facilitates native mobile biometric authentication (Face ID / Android Biometrics / Fingerprint)
 * via the Flutter mobile app shell bridge, or WebAuthn Passkeys in modern web browsers.
 *
 * Security Principles:
 * 1. Biometric templates, face vectors, and fingerprint data NEVER leave the device hardware.
 * 2. Mathreya never captures, stores, uploads, or processes raw biometric data or face images.
 * 3. Successful native biometric verification unlocks the securely persisted Appwrite session token.
 */

import { loginWithPasskey } from '../lib/appwrite';

export interface BiometricCheckResult {
  available: boolean;
  biometricType: 'face_id' | 'fingerprint' | 'passkey' | 'none';
  isNativeShell: boolean;
  description: string;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  isNativeShell?: boolean;
}

declare global {
  interface Window {
    FlutterBiometricChannel?: {
      postMessage: (message: string) => void;
    };
    flutter_inappwebview?: {
      callHandler: (handlerName: string, ...args: unknown[]) => Promise<unknown>;
    };
    onFlutterBiometricResult?: (result: { success: boolean; error?: string }) => void;
  }
}

/**
 * Checks hardware biometric / passkey capability on the device.
 */
export async function checkBiometricAvailability(): Promise<BiometricCheckResult> {
  if (typeof window === 'undefined') {
    return {
      available: false,
      biometricType: 'none',
      isNativeShell: false,
      description: 'Server-side environment',
    };
  }

  // 1. Check if running inside Flutter Native Mobile Shell Bridge
  if (window.FlutterBiometricChannel || window.flutter_inappwebview) {
    return {
      available: true,
      biometricType: 'face_id',
      isNativeShell: true,
      description: 'Flutter Native Shell (Face ID / Touch ID / Android Biometrics)',
    };
  }

  // 2. Check WebAuthn / Passkey platform authenticator support in browser
  if (
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  ) {
    try {
      const hasPasskey = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (hasPasskey) {
        return {
          available: true,
          biometricType: 'passkey',
          isNativeShell: false,
          description: 'WebAuthn Hardware Passkey / Biometric Authenticator',
        };
      }
    } catch (e) {
      console.debug('Passkey availability check failed:', e);
    }
  }

  return {
    available: false,
    biometricType: 'none',
    isNativeShell: false,
    description: 'Biometric hardware not available in standalone web browser',
  };
}

/**
 * Triggers native device biometric verification.
 * Does NOT collect or process face images or fingerprint data.
 */
export async function triggerBiometricAuth(): Promise<BiometricAuthResult> {
  const capability = await checkBiometricAvailability();

  // Case A: Flutter Mobile Shell Bridge
  if (capability.isNativeShell) {
    return new Promise<BiometricAuthResult>((resolve) => {
      // Setup listener callback for Flutter response
      window.onFlutterBiometricResult = (result) => {
        if (result.success) {
          resolve({ success: true, isNativeShell: true });
        } else {
          resolve({
            success: false,
            error: result.error || 'Native biometric verification failed or was cancelled.',
            isNativeShell: true,
          });
        }
      };

      // Invoke Flutter Channel
      if (window.flutter_inappwebview?.callHandler) {
        window.flutter_inappwebview.callHandler('authenticateBiometrics')
          .then((res: unknown) => {
            const response = res as { success?: boolean; error?: string } | undefined;
            if (response?.success) {
              resolve({ success: true, isNativeShell: true });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Biometric authentication cancelled.',
                isNativeShell: true,
              });
            }
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : 'Bridge error';
            resolve({ success: false, error: msg, isNativeShell: true });
          });
      } else if (window.FlutterBiometricChannel?.postMessage) {
        window.FlutterBiometricChannel.postMessage(JSON.stringify({ action: 'authenticateBiometrics' }));
      } else {
        resolve({
          success: false,
          error: 'Flutter biometric channel initialized but unavailable.',
          isNativeShell: true,
        });
      }
    });
  }

  // Case B: Web Browser Passkey / WebAuthn
  if (capability.biometricType === 'passkey') {
    const res = await loginWithPasskey();
    if (res.success) {
      return { success: true, isNativeShell: false };
    }
    return {
      success: false,
      error: res.error || 'Passkey authentication was cancelled or failed.',
      isNativeShell: false,
    };
  }

  // Case C: Web Browser without mobile shell wrapper
  return {
    success: false,
    error: 'Passkey or hardware biometric capability is not enabled on this device.',
    isNativeShell: false,
  };
}
