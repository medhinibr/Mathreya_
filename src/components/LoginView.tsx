import React, { useState, useEffect } from 'react';

import { useAuth } from '../auth/useAuth';

import { motion } from 'motion/react';

import {
  Lock,
  Mail,
  ArrowRight,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  ScanFace,
  Sparkles,
} from 'lucide-react';

import { UserProfile } from '../types';

import { triggerHapticFeedback } from '../utils/haptics';

import { getFriendlyAuthErrorMessage } from '../utils/authError';

interface LoginViewProps {
  onLoginSuccess: (user: Partial<UserProfile>) => void;
  onContinueAsGuest?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
}) => {
  const {
    login,
    signup,
    requestPasswordRecovery,
    resetPassword,
    sendOTP,
    verifyOTP,
    authenticateWithBiometrics,
    isBiometricAvailable,
    user: currentUser,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'login' | 'register' | 'forgot' | 'reset' | 'otp_email' | 'otp_verify'
  >('login');

  // Form State
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stage, setStage] = useState<
    'pregnancy_prenatal' | 'puberty' | 'husband'
  >('pregnancy_prenatal');

  // OTP State
  const [otpUserId, setOtpUserId] = useState('');
  const [otpSecret, setOtpSecret] = useState('');

  // Recovery / Reset Parameters from URL
  const [resetUserId, setResetUserId] = useState('');
  const [resetSecret, setResetSecret] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Detect Appwrite password recovery params in URL (userId & secret)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userIdParam = params.get('userId');
    const secretParam = params.get('secret');

    if (userIdParam && secretParam) {
      setResetUserId(userIdParam);
      setResetSecret(secretParam);
      setActiveTab('reset');
    }
  }, []);

  const handleSendOTP = async (targetEmail: string) => {
    const trimmedEmail = targetEmail.trim();
    if (!trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const token = await sendOTP(trimmedEmail);
      setOtpUserId(token.userId);
      triggerHapticFeedback('success');
      setSuccessMessage(`A 6-digit OTP code has been sent to ${trimmedEmail}.`);
      setActiveTab('otp_verify');
    } catch (error: unknown) {
      console.error('Appwrite send OTP error:', error);
      setErrorMessage(getFriendlyAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      triggerHapticFeedback('light');

      const result = await authenticateWithBiometrics();

      if (result.success) {
        triggerHapticFeedback('success');
        onLoginSuccess({
          name: currentUser.name || 'Mathreya User',
          email: currentUser.email,
          stage,
          isAuthenticated: true,
        });
      } else {
        triggerHapticFeedback('medium');
        setErrorMessage(result.error || 'Biometric authentication failed.');
      }
    } catch (error: unknown) {
      console.error('Biometric error:', error);
      setErrorMessage(getFriendlyAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const email = emailOrPhone.trim();
    const trimmedName = name.trim();

    // 1. FORGOT PASSWORD MODE
    if (activeTab === 'forgot') {
      if (!email.includes('@')) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }

      try {
        setIsLoading(true);
        await requestPasswordRecovery(email);
        triggerHapticFeedback('success');
        setSuccessMessage('Password recovery link has been sent to your email. Please check your inbox.');
      } catch (error: unknown) {
        console.error('Appwrite recovery error:', error);
        setErrorMessage(getFriendlyAuthErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2. RESET PASSWORD MODE
    if (activeTab === 'reset') {
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please verify your new password.');
        return;
      }

      try {
        setIsLoading(true);
        await resetPassword(resetUserId, resetSecret, password);
        triggerHapticFeedback('success');

        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        setSuccessMessage('Password updated successfully! Please sign in with your new password.');
        setActiveTab('login');
        setPassword('');
        setConfirmPassword('');
      } catch (error: unknown) {
        console.error('Appwrite password reset error:', error);
        setErrorMessage(getFriendlyAuthErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 3. SEND EMAIL OTP MODE
    if (activeTab === 'otp_email') {
      await handleSendOTP(email);
      return;
    }

    // 4. VERIFY EMAIL OTP MODE
    if (activeTab === 'otp_verify') {
      const code = otpSecret.trim();
      if (!code || code.length < 6) {
        setErrorMessage('Please enter the 6-digit OTP code received in your email.');
        return;
      }

      try {
        setIsLoading(true);
        const { user: appUser } = await verifyOTP(otpUserId, code);
        triggerHapticFeedback('success');

        onLoginSuccess({
          name: appUser?.name || currentUser.name || 'Mathreya User',
          email: appUser?.email || email,
          stage,
          isAuthenticated: true,
        });
      } catch (error: unknown) {
        console.error('Appwrite verify OTP error:', error);
        setErrorMessage(getFriendlyAuthErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 5. LOGIN & REGISTER MODES (PASSWORD AUTH)
    if (!email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (activeTab === 'register' && !trimmedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    try {
      setIsLoading(true);

      let appwriteName = trimmedName;

      if (activeTab === 'register') {
        await signup(email, password, trimmedName, stage);
      } else {
        const { user: appUser } = await login(email, password);
        if (appUser?.name) {
          appwriteName = appUser.name;
        }
      }

      triggerHapticFeedback('success');

      onLoginSuccess({
        name: appwriteName || currentUser.name || 'Mathreya User',
        email: currentUser.email || email,
        stage,
        isAuthenticated: true,
      });
    } catch (error: unknown) {
      console.error('Appwrite authentication error:', error);
      setErrorMessage(getFriendlyAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF8F5] flex flex-col justify-between p-5 sm:p-8 select-none text-[#4D2D22]">
      {/* 1. TOP BRAND HEADER WITH TRANSPARENT CIRCULAR MATHREYA LOGO */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto text-center space-y-3 pt-2 sm:pt-6"
      >
        {/* Transparent Circular Logo Emblem */}
        <div className="w-36 h-36 sm:w-44 sm:h-44 mx-auto filter drop-shadow-md">
          <img
            src="assets/logo.png"
            alt="Mathreya - A Care That Feels Like Home"
            className="w-full h-full object-contain"
          />
        </div>

        {/* ROBINHOOD SEGMENTED PILL TAB SWITCH FOR SIGN IN / REGISTER */}
        {(activeTab === 'login' || activeTab === 'register' || activeTab === 'otp_email') && (
          <div className="flex bg-[#F7EAE2] p-1 rounded-2xl border border-[#EADCD1] max-w-xs mx-auto mt-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                triggerHapticFeedback('light');
                setErrorMessage(null);
                setSuccessMessage(null);
                setActiveTab('login');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-serif font-extrabold transition cursor-pointer text-center ${
                activeTab === 'login' || activeTab === 'otp_email'
                  ? 'bg-[#B76A4B] text-white shadow-2xs'
                  : 'text-[#8B756A] hover:text-[#4D2D22]'
              }`}
            >
              Sign In
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                triggerHapticFeedback('light');
                setErrorMessage(null);
                setSuccessMessage(null);
                setActiveTab('register');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-serif font-extrabold transition cursor-pointer text-center ${
                activeTab === 'register'
                  ? 'bg-[#B76A4B] text-white shadow-2xs'
                  : 'text-[#8B756A] hover:text-[#4D2D22]'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* BACK BUTTON FOR FORGOT, RESET, OR OTP VERIFY MODES */}
        {(activeTab === 'forgot' || activeTab === 'reset' || activeTab === 'otp_verify') && (
          <div className="flex justify-center mt-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                triggerHapticFeedback('light');
                setErrorMessage(null);
                setSuccessMessage(null);
                setActiveTab(activeTab === 'otp_verify' ? 'otp_email' : 'login');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-serif font-bold text-[#B76A4B] hover:text-[#A05A3B] transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{activeTab === 'otp_verify' ? 'Change Email' : 'Back to Sign In'}</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* 2. AUTH FORM CONTAINER */}
      <motion.form
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleFormSubmit}
        className="w-full max-w-md mx-auto space-y-3.5 my-auto py-4"
      >
        {/* MODE HEADINGS */}
        {activeTab === 'forgot' && (
          <div className="text-center space-y-1 pb-1">
            <h2 className="text-lg font-serif font-bold text-[#4D2D22] flex items-center justify-center gap-2">
              <KeyRound className="w-5 h-5 text-[#B76A4B]" /> Password Recovery
            </h2>
            <p className="text-xs text-[#8B756A]">
              Enter your account email to receive a password reset link.
            </p>
          </div>
        )}

        {activeTab === 'reset' && (
          <div className="text-center space-y-1 pb-1">
            <h2 className="text-lg font-serif font-bold text-[#4D2D22] flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-[#B76A4B]" /> Set New Password
            </h2>
            <p className="text-xs text-[#8B756A]">
              Please choose a new password for your Mathreya account.
            </p>
          </div>
        )}

        {activeTab === 'otp_email' && (
          <div className="text-center space-y-1 pb-1">
            <h2 className="text-lg font-serif font-bold text-[#4D2D22] flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-[#B76A4B]" /> Email OTP Sign In
            </h2>
            <p className="text-xs text-[#8B756A]">
              Enter your email to receive a 6-digit one-time passcode.
            </p>
          </div>
        )}

        {activeTab === 'otp_verify' && (
          <div className="text-center space-y-1 pb-1">
            <h2 className="text-lg font-serif font-bold text-[#4D2D22] flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#B76A4B]" /> Verify OTP Code
            </h2>
            <p className="text-xs text-[#8B756A]">
              Please enter the 6-digit code sent to <span className="font-bold text-[#4D2D22]">{emailOrPhone}</span>
            </p>
          </div>
        )}

        {/* ERROR MESSAGE BANNER */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs font-medium flex items-start gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SUCCESS MESSAGE BANNER */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs font-medium flex items-start gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* FULL NAME INPUT (REGISTER ONLY) */}
        {activeTab === 'register' && (
          <div>
            <label className="block text-xs font-bold text-[#8B756A] mb-1">
              Full Name
            </label>

            <div className="relative">
              <input
                type="text"
                required
                disabled={isLoading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#EADCD1] text-xs sm:text-sm text-[#4D2D22] focus:outline-none focus:ring-2 focus:ring-[#B76A4B] font-medium shadow-2xs"
                placeholder="Enter full name"
              />

              <User className="w-4 h-4 text-[#8B756A] absolute right-3.5 top-3.5" />
            </div>
          </div>
        )}

        {/* EMAIL INPUT (LOGIN, REGISTER, FORGOT, OTP_EMAIL) */}
        {activeTab !== 'reset' && activeTab !== 'otp_verify' && (
          <div>
            <label className="block text-xs font-bold text-[#8B756A] mb-1">
              Email Address
            </label>

            <div className="relative">
              <input
                type="email"
                required
                disabled={isLoading}
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#EADCD1] text-xs sm:text-sm text-[#4D2D22] focus:outline-none focus:ring-2 focus:ring-[#B76A4B] font-medium shadow-2xs"
                placeholder="Enter email address"
              />

              <Mail className="w-4 h-4 text-[#8B756A] absolute right-3.5 top-3.5" />
            </div>
          </div>
        )}

        {/* OTP CODE INPUT (OTP_VERIFY ONLY) */}
        {activeTab === 'otp_verify' && (
          <div>
            <label className="block text-xs font-bold text-[#8B756A] mb-1">
              6-Digit OTP Code
            </label>

            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                disabled={isLoading}
                value={otpSecret}
                onChange={(e) => setOtpSecret(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#EADCD1] text-center tracking-[0.4em] font-mono text-base sm:text-lg font-bold text-[#4D2D22] focus:outline-none focus:ring-2 focus:ring-[#B76A4B] shadow-2xs"
                placeholder="000000"
              />

              <KeyRound className="w-4 h-4 text-[#8B756A] absolute right-3.5 top-3.5" />
            </div>

            <div className="flex justify-between items-center mt-2 px-1">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSendOTP(emailOrPhone)}
                className="text-[11px] font-medium text-[#B76A4B] hover:underline cursor-pointer"
              >
                Resend OTP Code
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => setActiveTab('login')}
                className="text-[11px] font-medium text-[#8B756A] hover:underline cursor-pointer"
              >
                Use Password Instead
              </button>
            </div>
          </div>
        )}

        {/* PASSWORD INPUT (LOGIN, REGISTER, RESET) */}
        {(activeTab === 'login' || activeTab === 'register' || activeTab === 'reset') && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[#8B756A]">
                {activeTab === 'reset' ? 'New Password' : 'Password'}
              </label>

              {activeTab === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback('light');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setActiveTab('forgot');
                  }}
                  className="text-[11px] font-medium text-[#B76A4B] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="password"
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#EADCD1] text-xs sm:text-sm text-[#4D2D22] focus:outline-none focus:ring-2 focus:ring-[#B76A4B] font-medium shadow-2xs"
                placeholder={activeTab === 'reset' ? 'Enter new password (min 8 chars)' : 'Enter secure password'}
              />

              <Lock className="w-4 h-4 text-[#8B756A] absolute right-3.5 top-3.5" />
            </div>
          </div>
        )}

        {/* CONFIRM PASSWORD INPUT (RESET ONLY) */}
        {activeTab === 'reset' && (
          <div>
            <label className="block text-xs font-bold text-[#8B756A] mb-1">
              Confirm New Password
            </label>

            <div className="relative">
              <input
                type="password"
                required
                disabled={isLoading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#EADCD1] text-xs sm:text-sm text-[#4D2D22] focus:outline-none focus:ring-2 focus:ring-[#B76A4B] font-medium shadow-2xs"
                placeholder="Re-enter new password"
              />

              <Lock className="w-4 h-4 text-[#8B756A] absolute right-3.5 top-3.5" />
            </div>
          </div>
        )}

        {/* PRIMARY LIFE STAGE SELECT (REGISTER ONLY) */}
        {activeTab === 'register' && (
          <div>
            <label className="block text-xs font-bold text-[#8B756A] mb-1">
              Primary Life Stage
            </label>

            <select
              disabled={isLoading}
              value={stage}
              onChange={(e) =>
                setStage(
                  e.target.value as
                  | 'pregnancy_prenatal'
                  | 'puberty'
                  | 'husband'
                )
              }
              className="w-full px-4 py-3 rounded-2xl bg-white border border-[#EADCD1] text-xs sm:text-sm text-[#4D2D22] focus:outline-none font-medium shadow-2xs"
            >
              <option value="pregnancy_prenatal">
                Pregnancy & Maternity Care
              </option>
              <option value="puberty">Puberty & Cycle Guide</option>
              <option value="husband">Partner Sync Hub</option>
            </select>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 bg-[#B76A4B] hover:bg-[#A05A3B] text-white font-serif font-extrabold rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 mt-1 disabled:opacity-70"
        >
          <span>
            {isLoading
              ? 'Please wait...'
              : activeTab === 'forgot'
              ? 'Send Recovery Link'
              : activeTab === 'reset'
              ? 'Update Password & Sign In'
              : activeTab === 'otp_email'
              ? 'Send OTP Code'
              : activeTab === 'otp_verify'
              ? 'Verify OTP & Sign In'
              : activeTab === 'register'
              ? 'Create Account & Enter'
              : 'Sign In to Sanctuary'}
          </span>

          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>

        {/* ALTERNATIVE SIGN IN OPTIONS (INSIDE SIGN IN TAB) */}
        {(activeTab === 'login' || activeTab === 'otp_email') && (
          <div className="pt-2 border-t border-[#EADCD1]/60 space-y-2">
            <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-[#8B756A] uppercase tracking-wider">
              <span>Or sign in with</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Option 1: Email OTP */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  triggerHapticFeedback('light');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setActiveTab(activeTab === 'otp_email' ? 'login' : 'otp_email');
                }}
                className="py-2.5 px-3 rounded-2xl bg-white border border-[#EADCD1] text-xs font-bold text-[#4D2D22] hover:bg-[#F7EAE2] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {activeTab === 'otp_email' ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-[#B76A4B]" />
                    <span>Use Password</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#B76A4B]" />
                    <span>Email OTP</span>
                  </>
                )}
              </button>

              {/* Option 2: Face ID / Biometrics */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleBiometricLogin}
                className="py-2.5 px-3 rounded-2xl bg-white border border-[#EADCD1] text-xs font-bold text-[#4D2D22] hover:bg-[#F7EAE2] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ScanFace className="w-3.5 h-3.5 text-[#B76A4B]" />
                <span>Face ID / Quick Login</span>
              </button>
            </div>
          </div>
        )}
      </motion.form>

      {/* 3. ENCRYPTED MEDICAL SHELL FOOTER */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md mx-auto text-center py-2"
      >
        <p className="text-[10px] text-[#8B756A] font-medium flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> AES-256
          Encrypted & Private Medical Shell
        </p>
      </motion.div>
    </div>
  );
};