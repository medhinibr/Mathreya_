import React, { useState } from 'react';
import { User, Shield, Heart, Smartphone, Phone, Mail, MapPin, CheckCircle2, Lock, FileCode, ArrowLeft, KeyRound, Trash2, Plus, AlertCircle, Fingerprint } from 'lucide-react';
import { UserProfile, AppScreen } from '../types';
import { useAuth } from '../auth/useAuth';

interface ProfileViewProps {
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onNavigate: (screen: AppScreen) => void;
  onOpenFlutterCode: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUpdateUser,
  onNavigate,
  onOpenFlutterCode,
}) => {
  const { registerPasskey, passkeys, deletePasskey } = useAuth();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || 'ananya.sharma@example.com');
  const [phone, setPhone] = useState(user.phone || '+91 98765 43210');
  const [emergencyName, setEmergencyName] = useState(user.emergencyContactName || 'Dr. Priya Sharma (Sister / OB-GYN)');
  const [emergencyPhone, setEmergencyPhone] = useState(user.emergencyContactPhone || '+91 98111 22233');
  const [location, setLocation] = useState(user.location || 'Bengaluru, Karnataka');
  const [faceAuth, setFaceAuth] = useState(user.faceAuthEnabled);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Passkey UI state
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyMsg, setPasskeyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [customPasskeyName, setCustomPasskeyName] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      name,
      email,
      phone,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
      location,
      faceAuthEnabled: faceAuth,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleRegisterPasskey = async () => {
    try {
      setIsRegisteringPasskey(true);
      setPasskeyMsg(null);
      const res = await registerPasskey(customPasskeyName.trim() || undefined);
      if (res.success) {
        setPasskeyMsg({
          type: 'success',
          text: `Device passkey "${res.passkey?.name || 'Device Passkey'}" registered successfully!`,
        });
        setCustomPasskeyName('');
      } else {
        setPasskeyMsg({
          type: 'error',
          text: res.error || 'Failed to register device passkey.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPasskeyMsg({ type: 'error', text: msg });
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    try {
      setPasskeyMsg(null);
      const success = await deletePasskey(id);
      if (success) {
        setPasskeyMsg({ type: 'success', text: 'Passkey removed from your account.' });
      } else {
        setPasskeyMsg({ type: 'error', text: 'Failed to remove passkey.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPasskeyMsg({ type: 'error', text: msg });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 px-2 md:px-4 text-[#3D251E]">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-xs font-bold text-[#8B3012] bg-white border border-[#EAE0D2] px-4 py-2.5 rounded-2xl hover:bg-[#FAF6F0] transition shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#C85A32]" />
          <span>Back to Dashboard</span>
        </button>

        <span className="text-xs font-bold bg-[#FFF5ED] text-[#8B3012] border border-[#F4D9CC] px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#C85A32]" /> Active Profile
        </span>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl border border-[#F0E8DD] shadow-xs overflow-hidden">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-[#8B3012] via-[#C85A32] to-[#D97757] relative border-b border-[#F0E8DD]">
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3.5 py-1 rounded-full text-[#8B3012] text-xs font-semibold flex items-center gap-1.5 border border-[#F4D9CC] shadow-xs">
            <Heart className="w-3.5 h-3.5 text-[#C85A32] fill-[#C85A32]" /> Life Stage: {user.stage.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        {/* User Info Bar */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-10 sm:-mt-12 gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-[#8B3012] to-[#C85A32] border-4 border-white shadow-md flex items-center justify-center font-serif text-2xl sm:text-3xl font-bold text-white shrink-0">
                {name.charAt(0)}
              </div>
              <div className="mb-0 sm:mb-1">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#5E2211]">{name}</h2>
                <p className="text-xs text-stone-500 font-medium flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C85A32]" /> {location} • Age {user.age}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenFlutterCode}
              className="w-full sm:w-auto bg-[#FFF5ED] hover:bg-[#FCEEE6] text-[#8B3012] border border-[#F4D9CC] font-bold px-4 py-2.5 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-[#C85A32]" />
              <span>Flutter Dart Source Code</span>
            </button>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Profile changes updated & secured in your local safe vault.</span>
        </div>
      )}

      {/* Edit Profile Form & Settings */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="bg-white rounded-3xl border border-[#F0E8DD] p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#5E2211] font-serif flex items-center gap-2 border-b border-[#FAF6F0] pb-3">
            <User className="w-4 h-4 text-[#C85A32]" /> Personal Details
          </h3>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#EAE0D2] text-xs font-medium text-[#3D251E] focus:outline-none focus:border-[#C85A32] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#EAE0D2] text-xs font-medium text-[#3D251E] focus:outline-none focus:border-[#C85A32] transition"
              />
              <Mail className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Phone Number</label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#EAE0D2] text-xs font-medium text-[#3D251E] focus:outline-none focus:border-[#C85A32] transition"
              />
              <Phone className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">City / Region</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#EAE0D2] text-xs font-medium text-[#3D251E] focus:outline-none focus:border-[#C85A32] transition"
            />
          </div>
        </div>

        {/* Security & Emergency Contacts */}
        <div className="space-y-6">
          {/* Security & Biometrics / Passkeys */}
          <div className="bg-white rounded-3xl border border-[#F0E8DD] p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-[#5E2211] font-serif flex items-center gap-2 border-b border-[#FAF6F0] pb-3">
              <Lock className="w-4 h-4 text-[#C85A32]" /> Biometric Safe Space & Passkeys
            </h3>

            <div className="flex items-center justify-between bg-[#FCFAF7] p-4 rounded-2xl border border-[#EAE0D2]">
              <div>
                <p className="text-xs font-bold text-[#5E2211]">Face ID / Biometric Unlock</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Protect private period logs, pregnancy ultrasound files & voice recordings
                </p>
              </div>
              <input
                type="checkbox"
                checked={faceAuth}
                onChange={(e) => setFaceAuth(e.target.checked)}
                className="w-5 h-5 accent-[#C85A32] rounded cursor-pointer"
              />
            </div>

            {/* Passkey Setup Section */}
            <div className="pt-2 border-t border-[#F7EAE2] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#C85A32]" />
                  <span className="text-xs font-bold text-[#5E2211]">Registered Device Passkeys</span>
                </div>
                <span className="text-[10px] bg-[#FFF5ED] text-[#8B3012] border border-[#F4D9CC] px-2.5 py-0.5 rounded-full font-bold">
                  {passkeys.length} Active
                </span>
              </div>

              {passkeyMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    passkeyMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {passkeyMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{passkeyMsg.text}</span>
                </div>
              )}

              {/* List of Registered Passkeys */}
              {passkeys.length > 0 ? (
                <div className="space-y-2">
                  {passkeys.map((pk) => (
                    <div
                      key={pk.id}
                      className="flex items-center justify-between bg-[#FCFAF7] p-3 rounded-xl border border-[#EAE0D2] text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Fingerprint className="w-4 h-4 text-[#C85A32]" />
                        <div>
                          <p className="font-bold text-[#4D2D22]">{pk.name}</p>
                          <p className="text-[10px] text-stone-400">
                            Added: {new Date(pk.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePasskey(pk.id)}
                        className="text-stone-400 hover:text-rose-600 p-1.5 transition rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Remove passkey"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-stone-500 italic bg-[#FCFAF7] p-3 rounded-xl border border-[#EAE0D2]">
                  No device passkeys registered yet. Add a passkey to quickly sign in with Face ID, Fingerprint, or Device PIN.
                </p>
              )}

              {/* Add Passkey Action */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Device Name (e.g. MacBook Pro, iPhone)"
                  value={customPasskeyName}
                  onChange={(e) => setCustomPasskeyName(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#FCFAF7] border border-[#EAE0D2] text-[#3D251E] focus:outline-none focus:border-[#C85A32]"
                />
                <button
                  type="button"
                  onClick={handleRegisterPasskey}
                  disabled={isRegisteringPasskey}
                  className="bg-[#FFF5ED] hover:bg-[#FCEEE6] text-[#8B3012] border border-[#F4D9CC] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isRegisteringPasskey ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-[#C85A32] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-[#C85A32]" />
                  )}
                  <span>{isRegisteringPasskey ? 'Verifying...' : 'Add Passkey'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-3xl border border-[#F0E8DD] p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-[#5E2211] font-serif flex items-center gap-2 border-b border-[#FAF6F0] pb-3">
              <Smartphone className="w-4 h-4 text-[#C85A32]" /> Emergency SOS Contact
            </h3>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Contact Name & Relation</label>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#EAE0D2] text-xs font-medium text-[#3D251E] focus:outline-none focus:border-[#C85A32] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Contact Emergency Phone</label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#EAE0D2] text-xs font-medium text-[#3D251E] focus:outline-none focus:border-[#C85A32] transition"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-[#C85A32] hover:bg-[#B34D29] text-white font-bold rounded-2xl text-sm transition shadow-md cursor-pointer"
          >
            Save Profile Changes
          </button>
        </div>
      </form>
    </div>
  );
};
