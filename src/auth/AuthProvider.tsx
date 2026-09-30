import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { UserProfile } from '../types';
import {
  getCurrentUser,
  login as appwriteLogin,
  signup as appwriteSignup,
  logout as appwriteLogout,
  createPasswordRecovery,
  completePasswordReset,
  sendEmailOTP,
  verifyEmailOTP,
  registerPasskey as appwriteRegisterPasskey,
  loginWithPasskey as appwriteLoginWithPasskey,
  getUserPasskeys,
  deletePasskey as appwriteDeletePasskey,
  PasskeyEntry,
} from '../lib/appwrite';
import {
  checkBiometricAvailability,
  triggerBiometricAuth,
} from '../utils/biometricAuth';
import { Models } from 'appwrite';

interface AuthProviderProps {
  children: React.ReactNode;
}

const defaultUserProfile: UserProfile = {
  name: '',
  email: '',
  phone: '',
  age: 26,
  stage: 'pregnancy_prenatal',
  faceAuthEnabled: false,
  isAuthenticated: false,
  emergencyContactName: 'Dr. Priya Sharma (Sister / OB-GYN)',
  emergencyContactPhone: '+91 98111 22233',
  location: 'Bengaluru, Karnataka',
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(defaultUserProfile);
  const [appwriteUser, setAppwriteUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Biometric state
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<'face_id' | 'fingerprint' | 'passkey' | 'none'>('none');

  const loadPasskeys = useCallback(async () => {
    const list = await getUserPasskeys();
    setPasskeys(list);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const u = await getCurrentUser();
        if (!isMounted) return;

        if (u) {
          setAppwriteUser(u);
          setUser({
            ...defaultUserProfile,
            name: u.name || 'Mathreya User',
            email: u.email || '',
            phone: u.phone || '',
            isAuthenticated: true,
          });
          const list = await getUserPasskeys();
          if (isMounted) {
            setPasskeys(list);
          }
        } else {
          setAppwriteUser(null);
          setUser({
            ...defaultUserProfile,
            isAuthenticated: false,
          });
          setPasskeys([]);
        }
      } catch (error) {
        console.error('Session check error:', error);
        if (isMounted) {
          setAppwriteUser(null);
          setUser({
            ...defaultUserProfile,
            isAuthenticated: false,
          });
          setPasskeys([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const initBiometrics = async () => {
      const bioResult = await checkBiometricAvailability();
      if (isMounted) {
        setIsBiometricAvailable(bioResult.available);
        setBiometricType(bioResult.biometricType);
      }
    };

    checkSession();
    initBiometrics();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const session = await appwriteLogin(email, password);
    const u = await getCurrentUser();
    if (u) {
      setAppwriteUser(u);
      setUser((prev) => ({
        ...prev,
        name: u.name || prev.name || 'Mathreya User',
        email: u.email || email,
        phone: u.phone || prev.phone || '',
        isAuthenticated: true,
      }));
      await loadPasskeys();
    }
    return { session, user: u };
  };

  const signup = async (email: string, password: string, name: string, stage?: string) => {
    const createdUser = await appwriteSignup(email, password, name, stage);
    const u = await getCurrentUser();
    if (u) {
      setAppwriteUser(u);
      setUser((prev) => ({
        ...prev,
        name: u.name || name || 'Mathreya User',
        email: u.email || email,
        phone: u.phone || '',
        stage: (stage as UserProfile['stage']) || prev.stage,
        isAuthenticated: true,
      }));
    }
    return createdUser;
  };

  const logout = async () => {
    await appwriteLogout();
    setAppwriteUser(null);
    setPasskeys([]);
    setUser({
      ...defaultUserProfile,
      isAuthenticated: false,
    });
  };

  const updateUser = (updated: Partial<UserProfile>) => {
    setUser((prev) => {
      const effectiveName =
        updated.name && updated.name !== 'User'
          ? updated.name
          : prev.name || updated.name || 'Mathreya User';

      return {
        ...prev,
        ...updated,
        name: effectiveName,
      };
    });
  };

  const requestPasswordRecovery = async (email: string) => {
    return await createPasswordRecovery(email);
  };

  const resetPassword = async (userId: string, secret: string, password: string) => {
    return await completePasswordReset(userId, secret, password);
  };

  const sendOTP = async (email: string) => {
    return await sendEmailOTP(email);
  };

  const verifyOTP = async (userId: string, secret: string) => {
    const session = await verifyEmailOTP(userId, secret);
    const u = await getCurrentUser();
    if (u) {
      setAppwriteUser(u);
      setUser((prev) => ({
        ...prev,
        name: u.name || prev.name || 'Mathreya User',
        email: u.email || '',
        phone: u.phone || prev.phone || '',
        isAuthenticated: true,
      }));
      await loadPasskeys();
    }
    return { session, user: u };
  };

  const registerPasskey = async (deviceName?: string) => {
    const res = await appwriteRegisterPasskey(deviceName);
    if (res.success) {
      await loadPasskeys();
    }
    return res;
  };

  const loginWithPasskey = async () => {
    const res = await appwriteLoginWithPasskey();
    if (res.success) {
      const u = await getCurrentUser();
      if (u) {
        setAppwriteUser(u);
        setUser((prev) => ({
          ...prev,
          name: u.name || prev.name || 'Mathreya User',
          email: u.email || '',
          phone: u.phone || prev.phone || '',
          isAuthenticated: true,
        }));
        await loadPasskeys();
        return { success: true };
      }
    }
    return { success: false, error: res.error || 'Passkey authentication failed.' };
  };

  const deletePasskey = async (id: string) => {
    const success = await appwriteDeletePasskey(id);
    if (success) {
      await loadPasskeys();
    }
    return success;
  };

  const authenticateWithBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
    const res = await triggerBiometricAuth();

    if (res.success) {
      const u = await getCurrentUser();
      if (u) {
        setAppwriteUser(u);
        setUser((prev) => ({
          ...prev,
          name: u.name || prev.name || 'Mathreya User',
          email: u.email || '',
          phone: u.phone || prev.phone || '',
          isAuthenticated: true,
        }));
        await loadPasskeys();
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Passkey verified on device, but no active Appwrite session was found. Please sign in with email & password once to sync your passkey.',
        };
      }
    }

    return {
      success: false,
      error: res.error || 'Biometric authentication failed.',
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        appwriteUser,
        isLoading,
        login,
        signup,
        logout,
        updateUser,
        requestPasswordRecovery,
        resetPassword,
        sendOTP,
        verifyOTP,
        authenticateWithBiometrics,
        registerPasskey,
        loginWithPasskey,
        passkeys,
        deletePasskey,
        isBiometricAvailable,
        biometricType,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
