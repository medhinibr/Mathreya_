import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { JournalEntry, MediaItem, CommunityPost } from '../types';
import { INITIAL_MEDIA, INITIAL_COMMUNITY_POSTS } from '../data';
import {
  Baby,
  Heart,
  Lock,
  Bot,
  PlayCircle,
  Users,
  CalendarCheck,
  Stethoscope,
  Share2,
  CheckCircle2,
  Droplets,
  Sparkles,
  Send,
  ShieldCheck,
  PhoneCall,
  Activity,
  Award,
  Calendar as CalendarIcon,
  Brain,
  FileText,
  Volume2,
  Video,
  BookOpen,
  Database,
  Flame,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { triggerHapticFeedback } from '../utils/haptics';
import { useAuth } from '../auth/useAuth';
import { getUserJournals, createJournal, createAppointment } from '../lib/appwrite';

interface PregnancyViewProps {
  initialSubStage?: 'prenatal' | 'postnatal';
  fontSizeClass: string;
  highContrast: boolean;
}

export const PregnancyView: React.FC<PregnancyViewProps> = ({
  initialSubStage = 'prenatal',
  fontSizeClass,
  highContrast,
}) => {
  const { appwriteUser } = useAuth();
  const userId = appwriteUser?.$id || '';

  // Main Stage Mode: Prenatal vs Postnatal (The 2 Core Pillars)
  const [stageMode, setStageMode] = useState<'prenatal' | 'postnatal'>(initialSubStage);

  // 7 Sub-modules matching attached flowchart!
  const [activeSubTab, setActiveSubTab] = useState<
    'routines' | 'safe_space' | 'ai_psychiatrist' | 'media' | 'consultation' | 'socials' | 'community'
  >('routines');

  // Tracker State
  const [waterGlasses, setWaterGlasses] = useState(8);
  const [takenItems, setTakenItems] = useState<string[]>(['Folic Acid & Iron']);

  // Safe Space Vault State
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // Doctor Consultation State
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // AI Psychiatrist State
  const [psychiatristInput, setPsychiatristInput] = useState('');
  const [psychMessages, setPsychMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: stageMode === 'prenatal'
        ? 'Namaste dear mother! 🪷 I am your Mathreya AI Psychiatrist. How are your heart and mind feeling today? Any worries about labor or body changes?'
        : 'Welcome back dear mom! 🪷 Postpartum healing takes gentle patience. How are your sleep levels and emotional energy today?'
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Media Filter State
  const [mediaFilter, setMediaFilter] = useState<'all' | 'audio' | 'video' | 'articles'>('all');

  const doctorsList = [
    {
      id: 'doc1',
      name: 'Dr. Radhika Sharma',
      specialty: 'Senior OB-GYN & High-Risk Pregnancy Specialist',
      experience: '18 Years Exp',
      hospital: 'Apollo Women Care',
      rating: '4.9 ★',
      availability: 'Today at 4:30 PM',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 'doc2',
      name: 'Dr. Anupama Varma',
      specialty: 'Certified Doula & Garbh Sanskar Expert',
      experience: '12 Years Exp',
      hospital: 'Holistic Maternity Center',
      rating: '4.8 ★',
      availability: 'Tomorrow at 11:00 AM',
      avatar: 'https://images.unsplash.com/photo-1594824813566-88855ce78961?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 'doc3',
      name: 'Dr. Meenakshi Iyer',
      specialty: 'Pediatrician & IBCLC Lactation Consultant',
      experience: '15 Years Exp',
      hospital: 'Motherhood Hospital',
      rating: '4.9 ★',
      availability: 'Today at 6:00 PM',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80',
    }
  ];

  const handleToggleItem = (item: string, e?: React.MouseEvent) => {
    if (e) triggerHapticFeedback('pulse', e.currentTarget as HTMLElement);
    else triggerHapticFeedback('pulse');
    setTakenItems(prev =>
      prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]
    );
  };

  const handleBookAppointment = async (doc: (typeof doctorsList)[number]) => {
    if (!userId) {
      setBookingSuccess(false);
      setBookingError('Please log in to book an appointment.');
      return;
    }

    setIsBooking(true);
    setBookingSuccess(false);
    setBookingError('');

    try {
      const appointmentDate = new Date();
      if (doc.availability.toLowerCase().startsWith('tomorrow')) {
        appointmentDate.setDate(appointmentDate.getDate() + 1);
      }

      const year = appointmentDate.getFullYear();
      const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
      const day = String(appointmentDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      const timeMatch = doc.availability.match(/at\s+(.+)$/i);
      const appointmentTime = timeMatch?.[1]?.trim() || doc.availability;

      const appointment = await createAppointment({
        userId,
        doctorName: doc.name,
        hospitalName: doc.hospital,
        appointmentDate: formattedDate,
        appointmentTime,
        appointmentType: stageMode === 'prenatal'
          ? 'Prenatal Consultation'
          : 'Postnatal Consultation',
        status: 'pending',
        notes: `Booked from Mathreya ${stageMode} consultation.`,
      });

      if (!appointment) {
        setBookingError('Unable to book the consultation right now. Please try again.');
        return;
      }

      setSelectedDoctor(doc.name);
      setBookingSuccess(true);
    } catch (error) {
      console.error('Appointment booking failed:', error);
      setBookingError('Unable to book the consultation right now. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setJournals([]);
      return;
    }

    let cancelled = false;

    const loadJournals = async () => {
      try {
        const dbJournals = await getUserJournals(userId);

        if (!cancelled) {
          setJournals(
            dbJournals.filter(
              j => j.category === 'prenatal' || j.category === 'postnatal'
            )
          );
        }
      } catch (error) {
        console.error('Failed to load pregnancy journals:', error);

        if (!cancelled) {
          setJournals([]);
        }
      }
    };

    void loadJournals();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || !userId) return;

    const entry = await createJournal({
      userId,
      title: newTitle,
      content: newContent,
      date: new Date().toISOString().split('T')[0],
      category: stageMode,
      mood: 'Serene',
      isEncrypted: true,
    });

    if (!entry) return;
    setJournals(prev => [entry, ...prev]);
    setNewTitle('');
    setNewContent('');
  };

  const handleSendPsychiatristMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!psychiatristInput.trim()) return;
    const userMsg = psychiatristInput;
    setPsychMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setPsychiatristInput('');
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg, persona: 'ai_psychiatrist' })
      });
      const data = await res.json();
      setPsychMessages(prev => [...prev, { sender: 'ai', text: data.text || 'Take deep grounding breaths. You are safe and doing an incredible job.' }]);
    } catch {
      setPsychMessages(prev => [...prev, { sender: 'ai', text: 'Feeling anxious during this journey is completely natural. Place a hand over your heart, breathe in peace for 4 seconds, and exhale slowly.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // 7 Sub-Modules from Architecture Diagram
  const pregnancyModules = [
    {
      id: 'routines',
      title: 'Balanced Routines',
      subtitle: stageMode === 'prenatal' ? 'Trimester Yoga & Garbh Sanskar' : 'Postpartum Recovery & Kegels',
      icon: Activity,
    },
    {
      id: 'safe_space',
      title: 'Safe Space',
      subtitle: 'AES-256 Private Journal Vault',
      icon: Lock,
    },
    {
      id: 'ai_psychiatrist',
      title: 'AI Psychiatrist',
      subtitle: 'Maternal Mental Health Bot',
      icon: Brain,
    },
    {
      id: 'media',
      title: 'Media Library',
      subtitle: 'Audio, Videos & Articles',
      icon: PlayCircle,
    },
    {
      id: 'consultation',
      title: '1-1 Consultation',
      subtitle: 'Book OB-GYN & Doula Experts',
      icon: Stethoscope,
    },
    {
      id: 'socials',
      title: 'Socials & Diet',
      subtitle: 'Maternity Myths & Diets',
      icon: Share2,
    },
    {
      id: 'community',
      title: 'The Community',
      subtitle: 'Verified Mothers Circle',
      icon: Users,
    },
  ];

  return (
    <div className={`space-y-6 max-w-full sm:max-w-2xl md:max-w-4xl xl:max-w-6xl mx-auto ${fontSizeClass} text-[#4D2D22] select-none pb-8`}>

      {/* 1. TOP HERO STAGE CARDS: PRENATAL & POSTNATAL (The Core 2 Pillars from Architecture) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold text-[#B76A4B] uppercase tracking-wider font-serif flex items-center gap-1.5">
            <span>🪷 Maternity Care Stages</span>
          </span>
          <span className="text-[10px] font-bold text-[#8B756A]">
            Select Stage below
          </span>
        </div>

        {/* Spacious 2-Column Hero Stage Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* STAGE 1: PRENATAL */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              triggerHapticFeedback('medium');
              setStageMode('prenatal');
            }}
            className={`p-5 rounded-[32px] text-left border transition-all cursor-pointer space-y-3 relative overflow-hidden ${stageMode === 'prenatal'
                ? 'bg-gradient-to-br from-[#B76A4B] to-[#C87958] text-white shadow-md border-transparent ring-4 ring-[#B76A4B]/20'
                : 'bg-white text-[#4D2D22] border-[#EADCD1] hover:border-[#B76A4B]/40 shadow-2xs'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-2xl ${stageMode === 'prenatal' ? 'bg-white/20 text-white' : 'bg-[#FFF8F5] text-[#B76A4B]'
                }`}>
                <Baby className="w-6 h-6" />
              </div>
              {stageMode === 'prenatal' ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-white text-[#B76A4B] uppercase tracking-wider">
                  Active Stage
                </span>
              ) : (
                <span className="text-xs text-[#8B756A] font-bold flex items-center gap-1">
                  Select <ChevronRight className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div>
              <h3 className={`text-xl font-serif font-extrabold ${stageMode === 'prenatal' ? 'text-white' : 'text-[#4D2D22]'
                }`}>
                Prenatal Journey
              </h3>
              <p className={`text-xs font-medium mt-1 leading-relaxed ${stageMode === 'prenatal' ? 'text-white/90' : 'text-[#8B756A]'
                }`}>
                Weekly fetal growth tracking, Garbh Sanskar Vedic Shlokas, trimester yoga, & OB-GYN consultations.
              </p>
            </div>
          </motion.button>

          {/* STAGE 2: POSTNATAL */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              triggerHapticFeedback('medium');
              setStageMode('postnatal');
            }}
            className={`p-5 rounded-[32px] text-left border transition-all cursor-pointer space-y-3 relative overflow-hidden ${stageMode === 'postnatal'
                ? 'bg-gradient-to-br from-[#B76A4B] to-[#C87958] text-white shadow-md border-transparent ring-4 ring-[#B76A4B]/20'
                : 'bg-white text-[#4D2D22] border-[#EADCD1] hover:border-[#B76A4B]/40 shadow-2xs'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-2xl ${stageMode === 'postnatal' ? 'bg-white/20 text-white' : 'bg-[#FFF8F5] text-rose-600'
                }`}>
                <Heart className="w-6 h-6 fill-current" />
              </div>
              {stageMode === 'postnatal' ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-white text-[#B76A4B] uppercase tracking-wider">
                  Active Stage
                </span>
              ) : (
                <span className="text-xs text-[#8B756A] font-bold flex items-center gap-1">
                  Select <ChevronRight className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div>
              <h3 className={`text-xl font-serif font-extrabold ${stageMode === 'postnatal' ? 'text-white' : 'text-[#4D2D22]'
                }`}>
                Postnatal Recovery
              </h3>
              <p className={`text-xs font-medium mt-1 leading-relaxed ${stageMode === 'postnatal' ? 'text-white/90' : 'text-[#8B756A]'
                }`}>
                Maternal postpartum physical healing, pelvic floor Kegels, newborn feeding logs, & lactation care.
              </p>
            </div>
          </motion.button>

        </div>
      </div>

      {/* 2. DEDICATED TOUCHSCREEN MODULE SELECTOR GRID (7 Sub-Nodes from Architecture Diagram) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B76A4B] animate-pulse" />
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider font-serif text-[#4D2D22]">
              {stageMode === 'prenatal' ? 'Prenatal Care Modules' : 'Postnatal Care Modules'}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-[#8B756A]">
            Tap card to view details
          </span>
        </div>

        {/* 7 Touch-friendly Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {pregnancyModules.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeSubTab === mod.id;

            return (
              <motion.button
                key={mod.id}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  triggerHapticFeedback('light');
                  setActiveSubTab(mod.id as any);
                }}
                className={`p-3.5 sm:p-4 rounded-3xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden ${isActive
                    ? 'bg-[#F7EAE2] border-2 border-[#B76A4B] text-[#B76A4B] shadow-md ring-2 ring-[#B76A4B]/20 scale-102'
                    : 'bg-white border-[#EADCD1] text-[#4D2D22] hover:border-[#B76A4B]/40 shadow-2xs'
                  }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-2 rounded-2xl border transition ${isActive ? 'bg-[#B76A4B] text-white border-transparent' : 'bg-[#FFF8F5] text-[#B76A4B] border-[#EADCD1]'
                    }`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  {isActive && (
                    <span className="text-[9px] font-extrabold bg-[#B76A4B] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-serif font-extrabold text-xs sm:text-sm leading-tight text-[#4D2D22]">
                    {mod.title}
                  </h4>
                  <p className="text-[10px] text-[#8B756A] font-medium leading-tight mt-0.5 line-clamp-1">
                    {mod.subtitle}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 3. ACTIVE SUB-MODULE CONTENT AREA */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${stageMode}-${activeSubTab}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {/* SUB-TAB 1: BALANCED ROUTINES */}
          {activeSubTab === 'routines' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Progress & Routine Checklists */}
              <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-6">
                <div className="flex justify-between items-center border-b border-[#EADCD1] pb-4">
                  <div>
                    <h3 className="font-serif font-extrabold text-lg text-[#4D2D22]">
                      {stageMode === 'prenatal' ? 'Trimester 2 • Week 24 Tracker' : 'Postpartum Recovery • Week 6 Tracker'}
                    </h3>
                    <p className="text-xs text-[#8B756A]">
                      {stageMode === 'prenatal' ? 'Baby size: Cantaloupe melon (~600g)' : 'Baby milestone: Smiles & eye contact tracking'}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-[#F7EAE2] text-[#B76A4B] text-xs font-bold rounded-full border border-[#EADCD1]">
                    Optimal Health
                  </span>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#8B756A]">
                    {stageMode === 'prenatal' ? 'Daily Garbh Sanskar & Health Actions' : 'Postpartum Recovery Actions'}
                  </h4>

                  <div className="space-y-2.5">
                    {[
                      { name: 'Folic Acid & Iron Supplement', category: 'Medication' },
                      { name: 'Calcium & Vitamin D3', category: 'Medication' },
                      { name: stageMode === 'prenatal' ? '15-Min Gentle Prenatal Yoga & Stretch' : 'Pelvic Floor Kegel Exercises', category: 'Routine' },
                      { name: stageMode === 'prenatal' ? 'Garbh Sanskar Vedic Shlokas Listening' : 'Infant Massage & Feeding Log', category: 'Wellness' },
                    ].map((item) => {
                      const done = takenItems.includes(item.name);
                      return (
                        <div
                          key={item.name}
                          onClick={(e) => handleToggleItem(item.name, e)}
                          className={`p-4 rounded-2xl border cursor-pointer transition flex justify-between items-center ${done
                              ? 'bg-[#F7EAE2] border-[#B76A4B] text-[#B76A4B] shadow-2xs'
                              : 'bg-[#FFF8F5] border-[#EADCD1] text-[#4D2D22] hover:bg-[#F7EAE2]'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className={`w-5 h-5 ${done ? 'text-[#B76A4B]' : 'text-stone-300'}`} />
                            <div>
                              <p className="font-bold text-xs">{item.name}</p>
                              <span className="text-[10px] text-[#8B756A]">{item.category}</span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold">{done ? 'Completed ✓' : 'Tap to Complete'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Hydration & Traditional Diet Sidebar */}
              <div className="space-y-5">
                <div className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xs text-[#4D2D22] uppercase tracking-wider flex items-center gap-1.5">
                      <Droplets className="w-4 h-4 text-cyan-600" /> Daily Hydration
                    </h3>
                    <span className="text-xs font-semibold text-[#8B756A]">{waterGlasses} / 10 Glasses</span>
                  </div>
                  <div className="w-full bg-[#FFF8F5] h-3 rounded-full overflow-hidden border border-[#EADCD1]">
                    <div
                      className="bg-cyan-500 h-full transition-all duration-300"
                      style={{ width: `${(waterGlasses / 10) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        triggerHapticFeedback('light', e.currentTarget);
                        setWaterGlasses(Math.max(0, waterGlasses - 1));
                      }}
                      className="flex-1 py-2 bg-[#FFF8F5] border border-[#EADCD1] rounded-xl text-xs font-bold text-[#4D2D22] cursor-pointer"
                    >
                      - 1 Glass
                    </button>
                    <button
                      onClick={(e) => {
                        triggerHapticFeedback('pulse', e.currentTarget);
                        setWaterGlasses(Math.min(14, waterGlasses + 1));
                      }}
                      className="flex-1 py-2 bg-[#B76A4B] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                    >
                      + 1 Glass
                    </button>
                  </div>
                </div>

                {/* Indian Traditional Diet Card */}
                <div className="bg-[#FFF8F5] p-5 rounded-[32px] border border-[#EADCD1] space-y-2">
                  <div className="flex items-center gap-1.5 text-[#B76A4B] font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" /> Traditional Diet Wisdom
                  </div>
                  <h4 className="font-serif font-bold text-sm text-[#4D2D22]">
                    {stageMode === 'prenatal' ? 'Soaked Almonds & Roasted Sesame' : 'Methi & Gond Laddu for Recovery'}
                  </h4>
                  <p className="text-xs text-[#8B756A] font-medium leading-relaxed">
                    {stageMode === 'prenatal'
                      ? 'Soak 5 almonds overnight in water. Rich in natural folate, Vitamin E, and calcium essential for fetal bone development.'
                      : 'Traditional recipe with fenugreek, edible gum (gond), dry fruits, and pure cow ghee to support lactation and post-labor bone strength.'}
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* SUB-TAB 2: SAFE SPACE (SECURED DATABASE VAULT) */}
          {activeSubTab === 'safe_space' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-4">
                <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold">
                  <Database className="w-4 h-4 text-emerald-600" /> Secured Database Vault (AES-256)
                </div>
                <h3 className="font-serif font-extrabold text-lg text-[#4D2D22]">Maternity Reflections</h3>
                <form onSubmit={handleAddJournal} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#8B756A] mb-1">Title</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Labor thoughts, baby movements..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#8B756A] mb-1">Confidential Reflection</label>
                    <textarea
                      rows={5}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Express your pregnancy or postpartum emotions freely. Encrypted locally..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#B76A4B] hover:bg-[#A05A3B] text-white font-extrabold text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" /> Save Encrypted Log
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-serif font-extrabold text-lg text-[#4D2D22]">Encrypted Vault Logs</h3>
                <div className="space-y-3">
                  {journals.map((j) => (
                    <div key={j.id} className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-[#4D2D22]">{j.title}</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Encrypted
                        </span>
                      </div>
                      <p className="text-xs text-[#8B756A] font-medium leading-relaxed">{j.content}</p>
                      <div className="flex justify-between items-center text-[10px] text-[#8B756A] border-t border-[#EADCD1] pt-2 mt-2 font-medium">
                        <span>Date: {j.date}</span>
                        <span>Stage: {j.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: AI PSYCHIATRIST */}
          {activeSubTab === 'ai_psychiatrist' && (
            <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs flex flex-col h-[580px]">
              <div className="flex items-center gap-3 pb-4 border-b border-[#EADCD1]">
                <div className="w-10 h-10 rounded-2xl bg-[#F7EAE2] border border-[#EADCD1] flex items-center justify-center text-[#B76A4B]">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-extrabold text-base text-[#4D2D22]">Maternal AI Psychiatrist & Counselor</h3>
                  <p className="text-xs text-[#8B756A]">Confidential guidance for labor anxiety, emotional exhaustion, or postpartum blues</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {psychMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed ${msg.sender === 'user'
                          ? 'bg-[#B76A4B] text-white font-medium rounded-tr-none'
                          : 'bg-[#FFF8F5] text-[#4D2D22] rounded-tl-none border border-[#EADCD1]'
                        }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendPsychiatristMessage} className="pt-3 border-t border-[#EADCD1] flex gap-2">
                <input
                  type="text"
                  value={psychiatristInput}
                  onChange={(e) => setPsychiatristInput(e.target.value)}
                  placeholder="Share how your mind feels today (anxiety, sleep, emotional exhaustion)..."
                  className="flex-1 px-4 py-3 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={isAiLoading || !psychiatristInput.trim()}
                  className="px-5 py-3 bg-[#B76A4B] hover:bg-[#A05A3B] text-white font-bold text-xs rounded-2xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </form>
            </div>
          )}

          {/* SUB-TAB 4: MEDIA LIBRARY */}
          {activeSubTab === 'media' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="font-serif font-extrabold text-lg text-[#4D2D22]">Maternity Media Library</h3>

                <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#EADCD1]">
                  {(['all', 'audio', 'video', 'articles'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMediaFilter(cat)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${mediaFilter === cat
                          ? 'bg-[#B76A4B] text-white shadow-2xs'
                          : 'text-[#8B756A] hover:bg-[#FFF8F5]'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {INITIAL_MEDIA
                  .filter(m => mediaFilter === 'all' || m.category === mediaFilter)
                  .map((item) => (
                    <div key={item.id} className="bg-white rounded-[32px] border border-[#EADCD1] overflow-hidden shadow-2xs flex flex-col">
                      <div className="h-40 relative bg-[#FFF8F5]">
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                          {item.category === 'audio' && <Volume2 className="w-3 h-3 text-amber-200" />}
                          {item.category === 'video' && <Video className="w-3 h-3 text-cyan-200" />}
                          {item.category === 'articles' && <BookOpen className="w-3 h-3 text-rose-200" />}
                          {item.category}
                        </span>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <h4 className="font-serif font-bold text-base text-[#4D2D22]">{item.title}</h4>
                          <p className="text-xs text-[#8B756A] line-clamp-2 mt-1 font-medium">{item.description}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#8B756A] border-t border-[#EADCD1] pt-3 font-semibold">
                          <span>{item.duration || item.readTime}</span>
                          <button className="px-3 py-1.5 bg-[#FFF8F5] text-[#B76A4B] border border-[#EADCD1] hover:bg-[#B76A4B] hover:text-white rounded-xl text-xs font-extrabold transition cursor-pointer">
                            Explore
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* SUB-TAB 5: 1-1 CONSULTATION */}
          {activeSubTab === 'consultation' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-serif font-extrabold text-lg text-[#4D2D22]">1-on-1 Specialist Consultation</h3>
                  <p className="text-xs text-[#8B756A]">Book video or clinic appointments with verified OB-GYNs & Doula specialists</p>
                </div>
              </div>

              {bookingSuccess && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Consultation request saved successfully for {selectedDoctor}.</span>
                </div>
              )}
              {bookingError && (
                <div className="bg-red-50 border border-red-300 text-red-900 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <span>{bookingError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {doctorsList.map((doc) => (
                  <div key={doc.id} className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs flex flex-col justify-between space-y-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={doc.avatar}
                        alt={doc.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#B76A4B]"
                      />
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#4D2D22]">{doc.name}</h4>
                        <p className="text-xs text-[#8B756A]">{doc.specialty}</p>
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold mt-1 inline-block">
                          {doc.rating} • {doc.experience}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-[#EADCD1] pt-3 text-xs space-y-1 text-[#8B756A]">
                      <p><strong>Hospital:</strong> {doc.hospital}</p>
                      <p><strong>Available:</strong> {doc.availability}</p>
                    </div>

                    <button
                      onClick={() => void handleBookAppointment(doc)}
                      disabled={isBooking}
                      className="w-full py-2.5 bg-[#B76A4B] hover:bg-[#A05A3B] disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-2xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> {isBooking ? 'Booking...' : 'Book 1-1 Session'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB 6: SOCIALS & DIET */}
          {activeSubTab === 'socials' && (
            <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-5">
              <div className="flex items-center gap-2 text-rose-800 bg-rose-50 px-3.5 py-1.5 rounded-2xl border border-rose-200 text-xs font-extrabold w-fit">
                <Share2 className="w-4 h-4 text-rose-600" /> Maternity Diets & Myth Busters
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FFF8F5] p-5 rounded-2xl border border-[#EADCD1] space-y-2">
                  <h4 className="font-serif font-bold text-base text-[#4D2D22]">Myth: Eating for Two</h4>
                  <p className="text-xs text-[#8B756A] font-medium leading-relaxed">
                    You only need about 300 additional nutrient-dense calories per day during the second and third trimesters, focusing on protein and iron.
                  </p>
                </div>

                <div className="bg-[#FFF8F5] p-5 rounded-2xl border border-[#EADCD1] space-y-2">
                  <h4 className="font-serif font-bold text-base text-[#4D2D22]">Postpartum Recovery Diets</h4>
                  <p className="text-xs text-[#8B756A] font-medium leading-relaxed">
                    Warm soups, cumin water, and ghee-infused lentils promote lactation and restore strength following labor.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 7: THE COMMUNITY */}
          {activeSubTab === 'community' && (
            <div className="space-y-4">
              <div className="bg-[#FFF8F5] p-4 rounded-2xl border border-[#EADCD1] text-xs text-[#4D2D22] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">Verified Mothers Circle: Moderated safe environment for pregnant women and new mothers.</span>
              </div>

              <div className="space-y-3.5">
                {INITIAL_COMMUNITY_POSTS.map((post) => (
                  <div key={post.id} className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#F7EAE2] text-[#B76A4B] font-bold flex items-center justify-center text-xs border border-[#EADCD1]">
                          {post.authorName[0]}
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-sm text-[#4D2D22]">{post.authorName}</h4>
                          <span className="text-[10px] text-[#8B756A]">{post.ageGroup} • {post.date}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        Verified Mom
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-[#4D2D22]">{post.title}</h5>
                    <p className="text-xs text-[#8B756A] font-medium leading-relaxed">{post.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
};
