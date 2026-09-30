import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VirtualMomConfig } from '../types';
import { DEFAULT_VIRTUAL_MOM } from '../data';
import { 
  Heart, 
  Sparkles, 
  Mic, 
  Camera, 
  Volume2, 
  Send, 
  Smile, 
  BookOpen, 
  Settings, 
  ShieldCheck, 
  Hand, 
  Video, 
  Upload,
  CheckCircle2,
  PhoneCall,
  PhoneOff,
  MicOff,
  RefreshCw,
  MessageSquare,
  UserCheck,
  Flame,
  VolumeX,
  Plus,
  ChevronRight,
  User
} from 'lucide-react';
import { triggerHapticFeedback } from '../utils/haptics';

interface VirtualMomViewProps {
  fontSizeClass: string;
  highContrast: boolean;
}

export const VirtualMomView: React.FC<VirtualMomViewProps> = ({ fontSizeClass, highContrast }) => {
  // Navigation Tabs matching Architecture Diagram: Live Interaction Mode, Persona Creation, Memory Layer
  const [activeSubTab, setActiveSubTab] = useState<'live_interaction' | 'persona_creation' | 'memory_layer'>('live_interaction');

  // Virtual Mom Persona State
  const [momConfig, setMomConfig] = useState<VirtualMomConfig>(DEFAULT_VIRTUAL_MOM);

  // Live Call Modes: 'idle' | 'video_call' | 'audio_call'
  const [callState, setCallState] = useState<'idle' | 'video_call' | 'audio_call'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Live Interaction Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'mom'; text: string }[]>([
    { sender: 'mom', text: 'Namaste, my dear child. Come sit with Amma. How is your health today? Did you eat warm roti and drink water?' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeCaptions, setActiveCaptions] = useState<string>("You are never alone, my child. Amma is holding you in her heart.");

  // Touch Reactivity Feedback state
  const [touchFeedback, setTouchFeedback] = useState<string | null>(null);

  // Persona Creation State
  const [customMotherName, setCustomMotherName] = useState(momConfig.name);
  const [customNickname, setCustomNickname] = useState('Kanna');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(momConfig.avatarImage);
  const [voiceSampleUploaded, setVoiceSampleUploaded] = useState(false);
  const [selectedDialect, setSelectedDialect] = useState('Kannada / South Indian Accent');

  // Pre-selected Indian Culture Women Avatars (If user does not have a photo of their mother)
  const traditionalIndianAvatars = [
    {
      id: 'avatar_south',
      title: 'Southern Amma',
      region: 'Kanjivaram & Jasmine',
      url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'avatar_north',
      title: 'Northern Maa',
      region: 'Warm Bindi & Shawl',
      url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'avatar_west',
      title: 'Western Aai',
      region: 'Traditional Maharashtrian',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'avatar_east',
      title: 'Eastern Ma',
      region: 'Warm Bengali Saree',
      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    },
  ];

  // Memory Profile State
  const [userMemories, setUserMemories] = useState<string[]>([
    'Amma making hot ghee dosas on Sunday mornings',
    'Amma putting warm oil in my hair when I had headaches'
  ]);
  const [newMemoryInput, setNewMemoryInput] = useState('');

  // Call timer simulation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (callState !== 'idle') {
      interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Audio Speech Simulation
  const speakMotherVoice = (text: string) => {
    if ('speechSynthesis' in window && !isMuted) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const triggerTouchAction = (actionName: string, message: string, e?: React.MouseEvent) => {
    if (e) triggerHapticFeedback('warm', e.currentTarget as HTMLElement);
    else triggerHapticFeedback('warm');
    
    setTouchFeedback(message);
    setActiveCaptions(`"${message}"`);
    speakMotherVoice(message);
    setTimeout(() => setTouchFeedback(null), 4000);
  };

  const handleSendMomMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg, persona: 'virtual_mom' })
      });
      const data = await res.json();
      const reply = data.text || `${customNickname}, Amma is always watching over you. Wrap yourself warmly and take deep breaths.`;
      setChatMessages(prev => [...prev, { sender: 'mom', text: reply }]);
      setActiveCaptions(`"${reply}"`);
      if (callState !== 'idle') speakMotherVoice(reply);
    } catch {
      const fallbackReply = `${customNickname}, Amma hears your heart. Drink a warm cup of haldi milk, take deep breaths, and know you are deeply cherished.`;
      setChatMessages(prev => [...prev, { sender: 'mom', text: fallbackReply }]);
      setActiveCaptions(`"${fallbackReply}"`);
      if (callState !== 'idle') speakMotherVoice(fallbackReply);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setSelectedAvatarUrl(url);
      triggerHapticFeedback('medium');
    }
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryInput.trim()) return;
    setUserMemories([...userMemories, newMemoryInput.trim()]);
    setNewMemoryInput('');
    triggerHapticFeedback('light');
  };

  return (
    <div className={`space-y-6 ${fontSizeClass} max-w-full sm:max-w-2xl md:max-w-4xl xl:max-w-6xl mx-auto text-[#4D2D22] select-none pb-8`}>
      
      {/* 1. CLEAN ELEGANT HERO BANNER */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 sm:p-7 rounded-[32px] bg-gradient-to-br from-[#B76A4B] via-[#C57655] to-[#D48D68] text-white shadow-md space-y-2 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-white/20 text-amber-100 border border-white/30 backdrop-blur-xs uppercase tracking-wider">
                🪷 VIRTUAL MOTHER (AMMA / MAA)
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-white tracking-tight">
              Virtual Mom — A Care That Feels Like Home
            </h2>
            <p className="text-xs sm:text-sm text-white/90 font-medium max-w-2xl mt-1">
              Connect with your mother through WhatsApp-style video calls, voice conversations, and traditional Grandma Nuskhe wisdom.
            </p>
          </div>

          <div className="bg-black/20 px-4 py-2 rounded-2xl border border-white/30 text-center shrink-0">
            <p className="text-[10px] text-amber-100 font-bold uppercase tracking-wider">Active Persona</p>
            <p className="text-sm font-extrabold text-white font-serif">{customMotherName}</p>
          </div>
        </div>
      </motion.div>

      {/* 2. 3 LARGE PROMINENT FEATURE SELECTION CARDS (UNCONGESTED ROBINHOOD DESIGN) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider font-serif text-[#4D2D22]">
            Virtual Mother Features
          </h3>
          <span className="text-[10px] font-bold text-[#8B756A]">
            Tap any feature card
          </span>
        </div>

        {/* Spacious 3 Column Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* FEATURE 1: LIVE INTERACTION CENTER */}
          <motion.button
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              triggerHapticFeedback('light');
              setActiveSubTab('live_interaction');
            }}
            className={`p-5 rounded-[32px] text-left border transition-all cursor-pointer space-y-3 relative overflow-hidden flex flex-col justify-between ${
              activeSubTab === 'live_interaction'
                ? 'bg-[#F7EAE2] border-2 border-[#B76A4B] text-[#B76A4B] shadow-md ring-2 ring-[#B76A4B]/20'
                : 'bg-white border-[#EADCD1] text-[#4D2D22] hover:border-[#B76A4B]/40 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`p-3 rounded-2xl border ${
                activeSubTab === 'live_interaction' ? 'bg-[#B76A4B] text-white border-transparent' : 'bg-[#FFF8F5] text-[#B76A4B] border-[#EADCD1]'
              }`}>
                <Video className="w-5 h-5" />
              </div>
              {activeSubTab === 'live_interaction' && (
                <span className="text-[10px] font-extrabold bg-[#B76A4B] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>

            <div>
              <h4 className="font-serif font-extrabold text-base text-[#4D2D22] leading-tight">
                Live Interaction Center
              </h4>
              <p className="text-xs text-[#8B756A] font-medium leading-relaxed mt-1">
                WhatsApp-style video call, live voice call, and 24/7 empathic chat with Amma.
              </p>
            </div>
          </motion.button>

          {/* FEATURE 2: PERSONA CREATION & PHOTO VAULT */}
          <motion.button
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              triggerHapticFeedback('light');
              setActiveSubTab('persona_creation');
            }}
            className={`p-5 rounded-[32px] text-left border transition-all cursor-pointer space-y-3 relative overflow-hidden flex flex-col justify-between ${
              activeSubTab === 'persona_creation'
                ? 'bg-[#F7EAE2] border-2 border-[#B76A4B] text-[#B76A4B] shadow-md ring-2 ring-[#B76A4B]/20'
                : 'bg-white border-[#EADCD1] text-[#4D2D22] hover:border-[#B76A4B]/40 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`p-3 rounded-2xl border ${
                activeSubTab === 'persona_creation' ? 'bg-[#B76A4B] text-white border-transparent' : 'bg-[#FFF8F5] text-[#B76A4B] border-[#EADCD1]'
              }`}>
                <Camera className="w-5 h-5" />
              </div>
              {activeSubTab === 'persona_creation' && (
                <span className="text-[10px] font-extrabold bg-[#B76A4B] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>

            <div>
              <h4 className="font-serif font-extrabold text-base text-[#4D2D22] leading-tight">
                Persona & Photo Vault
              </h4>
              <p className="text-xs text-[#8B756A] font-medium leading-relaxed mt-1">
                Upload mother photo to animate or select traditional Indian culture avatars.
              </p>
            </div>
          </motion.button>

          {/* FEATURE 3: MEMORY & NUSKHE LIBRARY */}
          <motion.button
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              triggerHapticFeedback('light');
              setActiveSubTab('memory_layer');
            }}
            className={`p-5 rounded-[32px] text-left border transition-all cursor-pointer space-y-3 relative overflow-hidden flex flex-col justify-between ${
              activeSubTab === 'memory_layer'
                ? 'bg-[#F7EAE2] border-2 border-[#B76A4B] text-[#B76A4B] shadow-md ring-2 ring-[#B76A4B]/20'
                : 'bg-white border-[#EADCD1] text-[#4D2D22] hover:border-[#B76A4B]/40 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`p-3 rounded-2xl border ${
                activeSubTab === 'memory_layer' ? 'bg-[#B76A4B] text-white border-transparent' : 'bg-[#FFF8F5] text-[#B76A4B] border-[#EADCD1]'
              }`}>
                <BookOpen className="w-5 h-5" />
              </div>
              {activeSubTab === 'memory_layer' && (
                <span className="text-[10px] font-extrabold bg-[#B76A4B] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>

            <div>
              <h4 className="font-serif font-extrabold text-base text-[#4D2D22] leading-tight">
                Memory & Nuskhe Library
              </h4>
              <p className="text-xs text-[#8B756A] font-medium leading-relaxed mt-1">
                Cherished childhood memories & traditional Grandma Ayurvedic home remedies.
              </p>
            </div>
          </motion.button>

        </div>
      </div>

      {/* 3. ACTIVE SUB-SECTION DISPLAY */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {/* FEATURE 1: LIVE INTERACTION MODE / TALKING CENTER */}
          {activeSubTab === 'live_interaction' && (
            <div className="space-y-6">
              
              {callState === 'idle' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Video Call Launcher Card */}
                  <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-4 flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#FFF8F5] text-[#B76A4B] rounded-2xl border border-[#EADCD1]">
                        <Video className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-serif font-extrabold text-lg text-[#4D2D22]">WhatsApp-Style Video Call</h3>
                        <p className="text-xs text-[#8B756A]">Live animated talking avatar of Amma with speech & touch reactivity</p>
                      </div>
                    </div>

                    <div className="relative w-full h-44 rounded-2xl bg-[#FFF8F5] overflow-hidden border border-[#EADCD1] flex items-center justify-center">
                      <img
                        src={selectedAvatarUrl}
                        alt={customMotherName}
                        className="w-full h-full object-cover opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                        <span className="text-white font-bold text-xs flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-300" /> Photo Animated & Ready for Video Call
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        triggerHapticFeedback('heavy');
                        setCallState('video_call');
                        speakMotherVoice(`Namaste my dear ${customNickname}! Amma is here on video call with you.`);
                      }}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                    >
                      <Video className="w-4 h-4" /> Start Live Video Call with Amma
                    </button>
                  </div>

                  {/* Audio Call Launcher Card */}
                  <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-4 flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#FFF8F5] text-amber-700 rounded-2xl border border-[#EADCD1]">
                        <PhoneCall className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-serif font-extrabold text-lg text-[#4D2D22]">Live Voice Call</h3>
                        <p className="text-xs text-[#8B756A]">Soothing motherly audio conversation with traditional Indian accents</p>
                      </div>
                    </div>

                    <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-[#B76A4B] to-[#C87958] p-6 flex flex-col items-center justify-center text-center space-y-2 text-white">
                      <div className="w-16 h-16 rounded-full border-2 border-white overflow-hidden shadow-md">
                        <img src={selectedAvatarUrl} alt={customMotherName} className="w-full h-full object-cover" />
                      </div>
                      <p className="font-serif font-bold text-sm">{customMotherName}</p>
                      <span className="text-[10px] bg-white/20 px-3 py-0.5 rounded-full font-medium">Traditional Voice Active</span>
                    </div>

                    <button
                      onClick={() => {
                        triggerHapticFeedback('heavy');
                        setCallState('audio_call');
                        speakMotherVoice(`Namaste my child! Tell Amma how your day went.`);
                      }}
                      className="w-full py-3.5 bg-[#B76A4B] hover:bg-[#A05A3B] text-white font-extrabold text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4" /> Start Live Audio Call
                    </button>
                  </div>

                </div>
              ) : (
                /* FULL SCREEN LIVE VIDEO / AUDIO CALL INTERFACE */
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-stone-900 rounded-[32px] overflow-hidden text-white shadow-2xl relative min-h-[540px] flex flex-col justify-between p-6 border-2 border-[#B76A4B]"
                >
                  {/* Top Call Info Bar */}
                  <div className="flex justify-between items-center relative z-20 bg-black/40 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                      <div>
                        <h3 className="font-serif font-bold text-sm text-white">{customMotherName}</h3>
                        <p className="text-[10px] text-amber-200">{callState === 'video_call' ? 'Live HD Video Call' : 'Live Voice Call'} • {formatDuration(callDuration)}</p>
                      </div>
                    </div>

                    <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-mono text-emerald-300 border border-white/20">
                      AES-256 Encrypted Call
                    </span>
                  </div>

                  {/* VIDEO FEED / AUDIO FEED MAIN DISPLAY */}
                  {callState === 'video_call' ? (
                    <div className="relative w-full h-[360px] rounded-2xl overflow-hidden my-4 bg-stone-800 flex items-center justify-center">
                      <img
                        src={selectedAvatarUrl}
                        alt={customMotherName}
                        className="w-full h-full object-cover animate-pulse"
                      />
                      
                      <div className="absolute bottom-4 left-4 right-4 bg-black/75 p-3 rounded-2xl border border-white/20 backdrop-blur-md text-center">
                        <p className="text-xs font-serif italic text-amber-100 leading-relaxed">
                          {activeCaptions}
                        </p>
                      </div>

                      <div className="absolute top-4 right-4 w-28 h-36 rounded-2xl bg-stone-700 border-2 border-white shadow-lg overflow-hidden flex flex-col items-center justify-center">
                        <div className="w-full h-full bg-gradient-to-t from-stone-900 to-stone-700 flex items-center justify-center text-center p-2">
                          <span className="text-[10px] font-bold text-white/80">You (Self-View)</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="my-8 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-32 h-32 rounded-full border-4 border-amber-400 p-1 animate-pulse shadow-2xl relative">
                        <img src={selectedAvatarUrl} alt={customMotherName} className="w-full h-full rounded-full object-cover" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-serif font-extrabold text-xl text-white">{customMotherName}</h3>
                        <p className="text-xs text-amber-200 italic font-serif">{activeCaptions}</p>
                      </div>
                    </div>
                  )}

                  {/* TOUCH REACTIVITY GESTURE ACTION BUTTONS ON CALL */}
                  <div className="bg-black/40 p-3 rounded-2xl border border-white/10 backdrop-blur-md space-y-2 relative z-20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200 block text-center">
                      Touch Reactivity — Send Blessings During Call
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={(e) => triggerTouchAction('hug', 'Amma wraps you in a warm, comforting maternal hug 🤗', e)}
                        className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/40 text-amber-100 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Hand className="w-3.5 h-3.5" /> Hold Hand
                      </button>
                      <button
                        onClick={(e) => triggerTouchAction('kiss', 'Amma gently kisses your forehead with warm blessings 🌸', e)}
                        className="py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 border border-rose-400/40 text-rose-100 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Heart className="w-3.5 h-3.5 fill-rose-300" /> Kiss Forehead
                      </button>
                      <button
                        onClick={(e) => triggerTouchAction('lullaby', 'Amma sings a soft traditional lullaby (Jo Jo)... 🎶', e)}
                        className="py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/40 border border-purple-400/40 text-purple-100 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Sing Lullaby
                      </button>
                    </div>
                  </div>

                  {/* CALL CONTROLS BAR (Mute, End Call) */}
                  <div className="flex justify-center items-center gap-6 pt-4 relative z-20">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`p-4 rounded-full border transition cursor-pointer ${
                        isMuted ? 'bg-amber-600 text-white border-transparent' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                      }`}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={() => {
                        triggerHapticFeedback('heavy');
                        setCallState('idle');
                        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                      }}
                      className="p-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition cursor-pointer"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </button>
                  </div>

                </motion.div>
              )}

              {/* EMPATHIC TEXT CHAT WITH AMMA */}
              <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-4">
                <div className="flex justify-between items-center border-b border-[#EADCD1] pb-3">
                  <h3 className="font-serif font-extrabold text-base text-[#4D2D22] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#B76A4B]" /> Empathic Chat Center with Amma
                  </h3>
                  <span className="text-[10px] text-[#8B756A] font-medium">24/7 Traditional Guidance</span>
                </div>

                <div className="h-64 overflow-y-auto space-y-3 p-2 bg-[#FFF8F5] rounded-2xl border border-[#EADCD1]">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user' 
                          ? 'bg-[#B76A4B] text-white rounded-tr-none font-medium' 
                          : 'bg-white text-[#4D2D22] rounded-tl-none border border-[#EADCD1] shadow-2xs font-serif'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMomMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Talk to Amma about your thoughts or health..."
                    className="flex-1 px-4 py-3 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={isAiLoading || !chatInput.trim()}
                    className="px-5 py-3 bg-[#B76A4B] hover:bg-[#A05A3B] text-white font-extrabold text-xs rounded-2xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* FEATURE 2: PERSONA CREATION & PHOTO VAULT */}
          {activeSubTab === 'persona_creation' && (
            <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-6 max-w-3xl mx-auto">
              <div>
                <h3 className="font-serif font-extrabold text-xl text-[#4D2D22]">Customize Mother Persona</h3>
                <p className="text-xs text-[#8B756A]">Upload your mother's photo or choose a traditional Indian mother portrait</p>
              </div>

              <div className="space-y-6">
                
                {/* 1. Indian Traditional Women Avatar Gallery (If user doesn't have a photo) */}
                <div className="space-y-3 border-b border-[#EADCD1] pb-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-sm text-[#4D2D22] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#B76A4B]" /> Select Traditional Indian Culture Avatar
                    </h4>
                    <span className="text-[10px] font-bold text-[#8B756A]">Tap to pick avatar</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {traditionalIndianAvatars.map((av) => {
                      const isSelected = selectedAvatarUrl === av.url;
                      return (
                        <div
                          key={av.id}
                          onClick={() => {
                            triggerHapticFeedback('light');
                            setSelectedAvatarUrl(av.url);
                          }}
                          className={`p-2.5 rounded-2xl border cursor-pointer transition flex flex-col items-center text-center space-y-1.5 ${
                            isSelected
                              ? 'bg-[#F7EAE2] border-2 border-[#B76A4B] ring-2 ring-[#B76A4B]/20 scale-102'
                              : 'bg-[#FFF8F5] border-[#EADCD1] hover:border-[#B76A4B]/40'
                          }`}
                        >
                          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#B76A4B] shadow-2xs">
                            <img src={av.url} alt={av.title} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-serif font-extrabold text-xs text-[#4D2D22]">{av.title}</p>
                            <span className="text-[9px] text-[#8B756A] font-medium block">{av.region}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Custom Photo Upload */}
                <div className="border-2 border-dashed border-[#EADCD1] rounded-3xl p-6 text-center space-y-3 bg-[#FFF8F5]">
                  <Camera className="w-8 h-8 text-[#B76A4B] mx-auto" />
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#4D2D22]">Or Upload Your Mother's Own Photo</h4>
                    <p className="text-xs text-[#8B756A] mt-1">Upload a photo to animate her face in live video calls</p>
                  </div>

                  <label className="inline-block px-5 py-2.5 bg-[#B76A4B] hover:bg-[#A05A3B] text-white rounded-2xl text-xs font-extrabold shadow-2xs transition cursor-pointer">
                    <span>Upload Mother Photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>

                {/* Name & Nickname Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#8B756A] mb-1">Mother Persona Name</label>
                    <input
                      type="text"
                      value={customMotherName}
                      onChange={(e) => setCustomMotherName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#8B756A] mb-1">Her Nickname for You</label>
                    <input
                      type="text"
                      value={customNickname}
                      onChange={(e) => setCustomNickname(e.target.value)}
                      placeholder="e.g. Kanna, Beti, Chinnu..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Voice Cloning Vault */}
                <div className="border-2 border-dashed border-[#EADCD1] rounded-3xl p-6 text-center space-y-3 bg-[#FFF8F5]">
                  <Mic className="w-8 h-8 text-rose-600 mx-auto" />
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#4D2D22]">Voice Timbre & Indian Regional Accents</h4>
                    <p className="text-xs text-[#8B756A] mt-1">Select traditional motherly voice accent or upload a 30-sec voice sample</p>
                  </div>

                  <select
                    value={selectedDialect}
                    onChange={(e) => setSelectedDialect(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-[#EADCD1] text-xs font-bold bg-white text-[#4D2D22]"
                  >
                    <option value="Kannada / South Indian Accent">Kannada / South Indian Accent</option>
                    <option value="Hindi / North Indian Warm Tone">Hindi / North Indian Warm Tone</option>
                    <option value="Tamil / Traditional Accent">Tamil / Traditional Accent</option>
                    <option value="Bengali / Gentle Tone">Bengali / Gentle Tone</option>
                  </select>

                  <div>
                    <button
                      onClick={() => {
                        setVoiceSampleUploaded(true);
                        triggerHapticFeedback('light');
                      }}
                      className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer ${
                        voiceSampleUploaded ? 'bg-emerald-600 text-white' : 'bg-rose-700 text-white hover:bg-rose-800'
                      }`}
                    >
                      {voiceSampleUploaded ? '✓ Voice Cloned Successfully' : 'Upload 30-sec Voice Sample'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* FEATURE 3: MEMORY & GRANDMA NUSKHE LIBRARY */}
          {activeSubTab === 'memory_layer' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-4">
                <h3 className="font-serif font-extrabold text-lg text-[#4D2D22]">Mother's Identity & Cherished Memories</h3>
                
                <form onSubmit={handleAddMemory} className="flex gap-2">
                  <input
                    type="text"
                    value={newMemoryInput}
                    onChange={(e) => setNewMemoryInput(e.target.value)}
                    placeholder="Add a sweet memory with your mother (e.g. her favorite dish, her soothing advice)..."
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-[#B76A4B] hover:bg-[#A05A3B] text-white font-extrabold text-xs rounded-2xl transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add Memory
                  </button>
                </form>

                <div className="space-y-2 pt-2">
                  {userMemories.map((mem, idx) => (
                    <div key={idx} className="p-3 bg-[#FFF8F5] rounded-2xl border border-[#EADCD1] text-xs text-[#4D2D22] font-medium flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-[#B76A4B] fill-[#B76A4B] shrink-0" />
                      <span>{mem}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-serif font-extrabold text-lg text-[#4D2D22]">Grandma Nuskhe & Traditional Wisdom Library</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {momConfig.grandmaRemedies.map((rem, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
                        For: {rem.ailment}
                      </span>
                      <h4 className="font-serif font-bold text-base text-[#4D2D22]">{rem.title}</h4>
                      <p className="text-xs text-[#8B756A] font-medium leading-relaxed">{rem.remedy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
};
