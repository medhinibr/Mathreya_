import { createContext } from 'react';
import { UserProfile } from '../types';
import { Models } from 'appwrite';

export interface AuthContextType {
  user: UserProfile;
  appwriteUser: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ session: Models.Session; user: Models.User<Models.Preferences> | null }>;
  signup: (email: string, password: string, name: string, stage?: string) => Promise<Models.User<Models.Preferences>>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<UserProfile>) => void;
  requestPasswordRecovery: (email: string) => Promise<Models.Token>;
  resetPassword: (userId: string, secret: string, password: string) => Promise<Models.Token>;
  sendOTP: (email: string) => Promise<Models.Token>;
  verifyOTP: (userId: string, secret: string) => Promise<{ session: Models.Session; user: Models.User<Models.Preferences> | null }>;
  authenticateWithBiometrics: () => Promise<{ success: boolean; error?: string }>;
  isBiometricAvailable: boolean;
  biometricType: 'face_id' | 'fingerprint' | 'passkey' | 'none';
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
