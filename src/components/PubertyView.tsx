import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { JournalEntry } from '../types';

import {
  INITIAL_JOURNALS,
  INITIAL_MEDIA,
  INITIAL_COMMUNITY_POSTS,
} from '../data';

import {
  Calendar as CalendarIcon,
  Lock,
  Bot,
  PlayCircle,
  Users,
  HeartHandshake,
  Sparkles,
  Check,
  Droplet,
  Send,
  ShieldCheck,
  BookOpen,
  Volume2,
  Video,
  Share2,
  Database,
  Flame,
} from 'lucide-react';

import { triggerHapticFeedback } from '../utils/haptics';
import { useAuth } from '../auth/useAuth';

import {
  getUserJournals,
  createJournal,
  getUserPeriodLogs,
  savePeriodLog,
} from '../lib/appwrite';

interface PubertyViewProps {
  fontSizeClass: string;
  highContrast: boolean;
}

export const PubertyView: React.FC<PubertyViewProps> = ({
  fontSizeClass,
  highContrast,
}) => {
  const { appwriteUser } = useAuth();
  const userId = appwriteUser?.$id || '';

  // ============================================================
  // PERIOD DATABASE STATE
  // ============================================================

  const [periodDocId, setPeriodDocId] = useState<string | undefined>(
    undefined
  );

  // true = user clicked "Period Started"
  // but database is NOT updated until Save Changes is clicked.
  const [isNewCyclePending, setIsNewCyclePending] = useState(false);

  const [isPeriodSaving, setIsPeriodSaving] = useState(false);

  const [periodSaveMessage, setPeriodSaveMessage] = useState('');

  // ============================================================
  // SUB TABS
  // ============================================================

  const [activeSubTab, setActiveSubTab] = useState<
    | 'tracker'
    | 'safe_space'
    | 'ai_assistant'
    | 'media'
    | 'community'
    | 'socials'
    | 'mentorship'
  >('tracker');

  // ============================================================
  // PERIOD TRACKER STATE
  // ============================================================

  const [cycleDay, setCycleDay] = useState(14);

  const [flow, setFlow] = useState<
    'light' | 'medium' | 'heavy'
  >('medium');

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    'Mild Cramps',
    'Tender Breasts',
  ]);

  const [waterGlasses, setWaterGlasses] = useState(6);

  // ============================================================
  // SAFE SPACE
  // ============================================================

  const [journals, setJournals] = useState<JournalEntry[]>(
    INITIAL_JOURNALS.filter(
      (j) =>
        j.category === 'puberty' ||
        j.category === 'prenatal'
    )
  );

  const [newTitle, setNewTitle] = useState('');

  const [newContent, setNewContent] = useState('');

  // ============================================================
  // AI ASSISTANT
  // ============================================================

  const [chatInput, setChatInput] = useState('');

  const [chatMessages, setChatMessages] = useState<
    { sender: 'user' | 'ai'; text: string }[]
  >([
    {
      sender: 'ai',
      text:
        'Namaste! 🌸 I am your Mathreya Adolescent Guide. Feel free to ask me anything about your cycle, cramps, mood changes, or hygiene tips. You are completely safe and supported here.',
    },
  ]);

  const [isAiLoading, setIsAiLoading] = useState(false);

  // ============================================================
  // MENTORSHIP
  // ============================================================

  const [mentorshipRole, setMentorshipRole] = useState<
    'mentee' | 'mentor'
  >('mentee');

  const [matchedMentor, setMatchedMentor] = useState(false);

  // ============================================================
  // MEDIA
  // ============================================================

  const [mediaFilter, setMediaFilter] = useState<
    'all' | 'audio' | 'video' | 'articles'
  >('all');

  // ============================================================
  // SYMPTOM TOGGLE
  // ============================================================

  const handleToggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym)
        ? prev.filter((s) => s !== sym)
        : [...prev, sym]
    );
  };

  // ============================================================
  // LOAD DATA FROM APPWRITE
  // ============================================================

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadDatabaseData = async () => {
      try {
        const [dbJournals, dbPeriodLogs] = await Promise.all([
          getUserJournals(userId),
          getUserPeriodLogs(userId),
        ]);

        if (cancelled) return;

        // ----------------------------
        // JOURNALS
        // ----------------------------

        if (dbJournals.length > 0) {
          setJournals(
            dbJournals.filter(
              (j) =>
                j.category === 'puberty' ||
                j.category === 'prenatal'
            )
          );
        }

        // ----------------------------
        // PERIOD LOGS
        // ----------------------------

        if (dbPeriodLogs.length > 0) {
          const latest = [...dbPeriodLogs].sort((a, b) =>
            b.date.localeCompare(a.date)
          )[0];

          setCycleDay(latest.cycleDay);

          setFlow(latest.flow);

          setSelectedSymptoms(latest.symptoms);

          setWaterGlasses(latest.waterGlasses);

          setPeriodDocId(latest.docId);
        }
      } catch (error) {
        console.error(
          '[PubertyView] Failed to load Appwrite data:',
          error
        );
      }
    };

    void loadDatabaseData();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ============================================================
  // JOURNAL SAVE
  // ============================================================

  const handleAddJournal = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!newTitle.trim() || !newContent.trim()) {
      return;
    }

    if (!userId) {
      return;
    }

    try {
      const entry = await createJournal({
        userId,
        title: newTitle.trim(),
        content: newContent.trim(),
        date: new Date()
          .toISOString()
          .split('T')[0],
        category: 'puberty',
        mood: 'Calm',
        isEncrypted: true,
      });

      if (!entry) {
        return;
      }

      setJournals((prev) => [
        entry,
        ...prev,
      ]);

      setNewTitle('');

      setNewContent('');
    } catch (error) {
      console.error(
        '[PubertyView] Failed to save journal:',
        error
      );
    }
  };

  // ============================================================
  // PERIOD SAVE
  // ============================================================
  //
  // IMPORTANT:
  //
  // isNewCycle = true
  //     -> Appwrite creates NEW row
  //
  // isNewCycle = false
  //     -> Appwrite updates existing row
  //
  // This function is called ONLY by "Save Changes".
  //
  // ============================================================

  const persistPeriodLog = async (
    values: {
      cycleDay: number;
      flow: 'light' | 'medium' | 'heavy';
      symptoms: string[];
      waterGlasses: number;
    },
    isNewCycle: boolean = false
  ) => {
    if (!userId) {
      setPeriodSaveMessage(
        'Please login before saving.'
      );
      return;
    }

    setIsPeriodSaving(true);

    setPeriodSaveMessage('');

    try {
      const result = await savePeriodLog({
        userId,

        date: new Date()
          .toISOString()
          .split('T')[0],

        cycleDay: values.cycleDay,

        flow: values.flow,

        symptoms: values.symptoms,

        waterGlasses: values.waterGlasses,

        // New cycle:
        // don't send old document ID.
        //
        // Normal save:
        // use existing document ID.
        docId: isNewCycle
          ? undefined
          : periodDocId,

        // Appwrite uses this to decide
        // CREATE vs UPDATE.
        isNewCycle,
      });

      if (result?.docId) {
        setPeriodDocId(result.docId);
      }

      if (result) {
        setPeriodSaveMessage(
          isNewCycle
            ? 'New cycle saved successfully ✓'
            : 'Changes saved successfully ✓'
        );

        // New cycle is no longer pending.
        setIsNewCyclePending(false);
      } else {
        setPeriodSaveMessage(
          'Could not save. Please try again.'
        );
      }
    } catch (error) {
      console.error(
        '[PubertyView] Failed to save period log:',
        error
      );

      setPeriodSaveMessage(
        'Could not save. Please try again.'
      );
    } finally {
      setIsPeriodSaving(false);
    }
  };

  // ============================================================
  // AI CHAT
  // ============================================================

  const handleSendAiMessage = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!chatInput.trim()) {
      return;
    }

    const userMsg = chatInput;

    setChatMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text: userMsg,
      },
    ]);

    setChatInput('');

    setIsAiLoading(true);

    try {
      const res = await fetch(
        '/api/ai/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: userMsg,
            persona: 'puberty_assistant',
          }),
        }
      );

      const data = await res.json();

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text:
            data.text ||
            'Take deep breaths, drink warm water with ajwain, and rest.',
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text:
            'Cramps and cycle changes are very natural during Kanya Ritu. Warm compresses and ajwain tea bring quick comfort!',
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // ============================================================
  // FEATURE MODULES
  // ============================================================

  const pubertyModules = [
    {
      id: 'tracker',
      title: 'Period Tracker',
      subtitle: 'Cycle & Ovulation Log',
      icon: CalendarIcon,
      badge: 'Interactive',
    },
    {
      id: 'safe_space',
      title: 'Safe Space',
      subtitle: 'AES-256 Private Journal',
      icon: Lock,
      badge: 'Encrypted',
    },
    {
      id: 'ai_assistant',
      title: 'AI Assistant',
      subtitle: 'Amma Health Chatbot',
      icon: Bot,
      badge: '24/7 AI',
    },
    {
      id: 'media',
      title: 'Media Library',
      subtitle: 'Audio, Video & Articles',
      icon: PlayCircle,
      badge: 'Curated',
    },
    {
      id: 'community',
      title: 'Monitored Forum',
      subtitle: 'Verified Safe Community',
      icon: Users,
      badge: 'Safe',
    },
    {
      id: 'socials',
      title: 'Socials & Hygiene',
      subtitle: 'Myths & Health Awareness',
      icon: Share2,
      badge: 'Awareness',
    },
    {
      id: 'mentorship',
      title: 'Sister Mentorship',
      subtitle: '1-on-1 Mentee Circle',
      icon: HeartHandshake,
      badge: 'Mentorship',
    },
  ];

  return (
    <div
      className={`space-y-5 max-w-full sm:max-w-2xl md:max-w-4xl xl:max-w-6xl mx-auto ${fontSizeClass} text-[#4D2D22] select-none pb-8`}
    >
      {/* ======================================================
          HERO
      ====================================================== */}

      <motion.div
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="p-5 sm:p-6 rounded-[32px] bg-gradient-to-br from-[#B76A4B] via-[#C57655] to-[#D48D68] text-white shadow-md relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-amber-100 border border-white/30 tracking-widest uppercase">
              🪷 Kanya Ritu Care
            </span>

            <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-white tracking-tight">
              Puberty Sanctuary
            </h2>

            <p className="text-xs text-white/90 font-serif italic">
              "Nurturing adolescent growth & cycle wellness"
            </p>
          </div>

          <div className="bg-black/20 px-4 py-2.5 rounded-2xl border border-white/20 flex items-center gap-4 shrink-0 backdrop-blur-xs">
            <div className="text-center pr-3 border-r border-white/20">
              <span className="text-[9px] text-amber-100 font-bold uppercase block">
                Cycle
              </span>

              <span className="text-lg font-serif font-extrabold text-white">
                Day {cycleDay}
              </span>
            </div>

            <div className="text-center">
              <span className="text-[9px] text-amber-100 font-bold uppercase block">
                Next Period
              </span>

              <span className="text-xs font-bold text-emerald-200">
                14 Days
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ======================================================
          MODULE SELECTOR
      ====================================================== */}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B76A4B] animate-pulse" />

            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider font-serif text-[#4D2D22]">
              Select Feature Module
            </h3>
          </div>

          <span className="text-[10px] font-bold text-[#8B756A]">
            Tap card to open
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {pubertyModules.map((mod) => {
            const Icon = mod.icon;

            const isActive =
              activeSubTab === mod.id;

            return (
              <motion.button
                key={mod.id}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  triggerHapticFeedback('light');

                  setActiveSubTab(
                    mod.id as any
                  );
                }}
                className={`p-3.5 rounded-3xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden ${isActive
                    ? 'bg-[#F7EAE2] border-2 border-[#B76A4B] text-[#B76A4B] shadow-md ring-2 ring-[#B76A4B]/20 scale-102'
                    : 'bg-white border-[#EADCD1] text-[#4D2D22] hover:border-[#B76A4B]/40 shadow-2xs'
                  }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`p-2 rounded-2xl border transition ${isActive
                        ? 'bg-[#B76A4B] text-white border-transparent'
                        : 'bg-[#FFF8F5] text-[#B76A4B] border-[#EADCD1]'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
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

      {/* ======================================================
          ACTIVE CONTENT
      ====================================================== */}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: -15,
          }}
          transition={{
            duration: 0.25,
          }}
        >
          {/* ==================================================
              PERIOD TRACKER
          ================================================== */}

          {activeSubTab === 'tracker' && (
            <div className="space-y-5">
              {/* Live Status Header */}

              <div className="p-5 rounded-[32px] bg-white border border-[#EADCD1] shadow-2xs space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#B76A4B]/30 p-1 flex items-center justify-center bg-[#FFF8F5] shrink-0">
                      <div className="w-full h-full rounded-full border-2 border-dashed border-[#B76A4B] flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] uppercase font-bold text-[#8B756A]">
                          DAY
                        </span>

                        <span className="text-xl sm:text-2xl font-serif font-extrabold text-[#4D2D22]">
                          {cycleDay}
                        </span>

                        <span className="text-[8px] text-emerald-700 font-bold">
                          Fertile
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          FERTILE WINDOW ACTIVE
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-serif font-extrabold text-[#4D2D22]">
                        Day {cycleDay} • Fertile Phase
                      </h3>

                      <p className="text-xs text-[#8B756A] font-medium leading-relaxed max-w-md">
                        Next period expected in{' '}
                        <strong className="text-[#4D2D22] font-bold">
                          14 days
                        </strong>
                        .
                      </p>
                    </div>
                  </div>

                  {/* QUICK ACTIONS */}

                  <div className="grid grid-cols-2 gap-2 w-full md:w-auto shrink-0">
                    <button
                      onClick={(e) => {
                        triggerHapticFeedback(
                          'pulse',
                          e.currentTarget
                        );

                        handleToggleSymptom(
                          'Mild Cramps'
                        );
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-[#B76A4B] text-white font-extrabold text-xs shadow-2xs hover:bg-[#A05A3B] transition cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-amber-200" />

                      <span>Log Symptom</span>
                    </button>

                    {/* IMPORTANT:
                        This does NOT save to database.
                        It only marks a new cycle as pending.
                    */}

                    <button
                      onClick={(e) => {
                        triggerHapticFeedback(
                          'heavy',
                          e.currentTarget
                        );

                        setCycleDay(1);

                        setIsNewCyclePending(
                          true
                        );

                        setPeriodSaveMessage('');
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-2xs transition cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1.5"
                    >
                      <Flame className="w-4 h-4 text-rose-200" />

                      <span>Period Started</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar & Flow Grid */}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* CALENDAR */}

                <div className="lg:col-span-2 bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-4">
                  <div className="flex justify-between items-center border-b border-[#EADCD1] pb-3">
                    <div>
                      <h3 className="font-serif font-extrabold text-base text-[#4D2D22] flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-[#B76A4B]" />

                        <span>
                          August Cycle Log
                        </span>
                      </h3>

                      <p className="text-xs text-[#8B756A]">
                        Standard 28-Day Period Cycle
                      </p>
                    </div>

                    <span className="px-3 py-1 bg-[#F7EAE2] text-[#B76A4B] text-xs font-bold rounded-full border border-[#EADCD1]">
                      Fertile Phase
                    </span>
                  </div>

                  {/* DAYS GRID */}

                  <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold">
                    {[
                      'Sun',
                      'Mon',
                      'Tue',
                      'Wed',
                      'Thu',
                      'Fri',
                      'Sat',
                    ].map((d) => (
                      <div
                        key={d}
                        className="text-[#8B756A] py-1 font-bold"
                      >
                        {d}
                      </div>
                    ))}

                    {Array.from(
                      {
                        length: 31,
                      },
                      (_, i) => i + 1
                    ).map((day) => {
                      const isCurrent =
                        day === cycleDay;

                      const isPeriodDay =
                        day >= 18 &&
                        day <= 22;

                      const isOvulation =
                        day === 14;

                      return (
                        <button
                          key={day}
                          onClick={(e) => {
                            triggerHapticFeedback(
                              'pulse',
                              e.currentTarget
                            );

                            // UI only.
                            // Database save happens
                            // only on Save Changes.
                            setCycleDay(day);
                          }}
                          className={`py-2.5 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${isCurrent
                              ? 'bg-[#B76A4B] text-white shadow-md ring-2 ring-[#B76A4B]/30'
                              : isPeriodDay
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                                : isOvulation
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                  : 'bg-[#FFF8F5] text-[#4D2D22] hover:bg-[#F7EAE2] border border-[#EADCD1]'
                            }`}
                        >
                          <span>
                            {day}
                          </span>

                          {isPeriodDay && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          )}

                          {isOvulation && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* SYMPTOMS */}

                  <div className="border-t border-[#EADCD1] pt-3 space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#8B756A]">
                      Symptoms & Mood Tracker
                    </h4>

                    <div className="flex flex-wrap gap-2">
                      {[
                        'Mild Cramps',
                        'Bloating',
                        'Tender Breasts',
                        'Acne',
                        'Headache',
                        'Energy Low',
                        'Serene Mood',
                      ].map((sym) => {
                        const active =
                          selectedSymptoms.includes(
                            sym
                          );

                        return (
                          <button
                            key={sym}
                            onClick={(e) => {
                              triggerHapticFeedback(
                                'light',
                                e.currentTarget
                              );

                              // UI only.
                              // No database call here.
                              handleToggleSymptom(
                                sym
                              );
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer active:scale-95 ${active
                                ? 'bg-[#B76A4B] text-white border-[#B76A4B] shadow-2xs'
                                : 'bg-[#FFF8F5] text-[#4D2D22] border-[#EADCD1] hover:bg-[#F7EAE2]'
                              }`}
                          >
                            {active
                              ? '✓ '
                              : '+ '}

                            {sym}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* FLOW + HYDRATION */}

                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-3">
                    <h3 className="font-bold text-xs text-[#4D2D22] uppercase tracking-wider">
                      Flow Level
                    </h3>

                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          'light',
                          'medium',
                          'heavy',
                        ] as const
                      ).map((f) => (
                        <button
                          key={f}
                          onClick={(e) => {
                            triggerHapticFeedback(
                              'medium',
                              e.currentTarget
                            );

                            // UI only.
                            setFlow(f);
                          }}
                          className={`py-2 rounded-2xl text-center border font-bold capitalize text-xs transition cursor-pointer active:scale-95 ${flow === f
                              ? 'bg-[#B76A4B] text-white border-[#B76A4B] shadow-2xs'
                              : 'bg-[#FFF8F5] text-[#4D2D22] border-[#EADCD1]'
                            }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-[#EADCD1] pt-3 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#4D2D22] flex items-center gap-1">
                          <Droplet className="w-4 h-4 text-cyan-600" />

                          Hydration
                        </span>

                        <span className="font-semibold text-[#8B756A]">
                          {waterGlasses} / 8 Glasses
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            triggerHapticFeedback(
                              'light',
                              e.currentTarget
                            );

                            // UI only.
                            setWaterGlasses(
                              Math.max(
                                0,
                                waterGlasses - 1
                              )
                            );
                          }}
                          className="w-8 h-8 rounded-xl bg-[#FFF8F5] text-[#4D2D22] border border-[#EADCD1] font-bold cursor-pointer"
                        >
                          -
                        </button>

                        <div className="flex-1 bg-[#FFF8F5] h-3 rounded-full overflow-hidden border border-[#EADCD1]">
                          <div
                            className="bg-cyan-500 h-full transition-all duration-300"
                            style={{
                              width: `${(waterGlasses /
                                  8) *
                                100
                                }%`,
                            }}
                          />
                        </div>

                        <button
                          onClick={(e) => {
                            triggerHapticFeedback(
                              'pulse',
                              e.currentTarget
                            );

                            // UI only.
                            setWaterGlasses(
                              Math.min(
                                12,
                                waterGlasses + 1
                              )
                            );
                          }}
                          className="w-8 h-8 rounded-xl bg-cyan-600 text-white font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* NUSKHE */}

                  <div className="bg-[#FFF8F5] p-4.5 rounded-[32px] border border-[#EADCD1] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#B76A4B] font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />

                      Traditional Nuskhe
                    </div>

                    <h4 className="font-serif font-bold text-sm text-[#4D2D22]">
                      Ajwain & Organic Jaggery Water
                    </h4>

                    <p className="text-xs text-[#8B756A] font-medium leading-relaxed">
                      Boil 1 tsp of Ajwain with warm
                      jaggery water. Sip twice daily
                      during flow to soothe cramps
                      naturally.
                    </p>
                  </div>

                  {/* ==================================================
                      SAVE CHANGES
                      ONLY THIS BUTTON WRITES TO DATABASE
                  ================================================== */}

                  <div className="space-y-2">
                    <button
                      onClick={(e) => {
                        triggerHapticFeedback(
                          'medium',
                          e.currentTarget
                        );

                        void persistPeriodLog(
                          {
                            cycleDay,
                            flow,
                            symptoms:
                              selectedSymptoms,
                            waterGlasses,
                          },
                          isNewCyclePending
                        );
                      }}
                      disabled={
                        isPeriodSaving ||
                        !userId
                      }
                      className="w-full py-3 bg-[#B76A4B] hover:bg-[#A05A3B] disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-95"
                    >
                      <Check className="w-4 h-4" />

                      {isPeriodSaving
                        ? 'Saving...'
                        : isNewCyclePending
                          ? 'Save New Cycle'
                          : 'Save Changes'}
                    </button>

                    {periodSaveMessage && (
                      <p
                        className={`text-[10px] text-center font-bold ${periodSaveMessage.includes(
                          'successfully'
                        )
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                          }`}
                      >
                        {periodSaveMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================
              SAFE SPACE
          ================================================== */}

          {activeSubTab === 'safe_space' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-white p-5 sm:p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-4">
                <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold">
                  <Database className="w-4 h-4 text-emerald-600" />

                  Secured Database Vault (AES-256)
                </div>

                <h3 className="font-serif font-extrabold text-base text-[#4D2D22]">
                  Confidential Reflection
                </h3>

                <form
                  onSubmit={handleAddJournal}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-bold text-[#8B756A] mb-1">
                      Title
                    </label>

                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) =>
                        setNewTitle(
                          e.target.value
                        )
                      }
                      placeholder="e.g. Body changes, school thoughts..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#8B756A] mb-1">
                      Confidential Thoughts
                    </label>

                    <textarea
                      rows={4}
                      value={newContent}
                      onChange={(e) =>
                        setNewContent(
                          e.target.value
                        )
                      }
                      placeholder="Express your feelings freely. Encrypted locally..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#B76A4B] hover:bg-[#A05A3B] text-white font-extrabold text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />

                    Save Encrypted Entry
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-3">
                <h3 className="font-serif font-extrabold text-base text-[#4D2D22]">
                  Encrypted Safe Vault Logs
                </h3>

                <div className="space-y-3">
                  {journals.map((j) => (
                    <div
                      key={j.id}
                      className="bg-white p-4.5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-[#4D2D22]">
                          {j.title}
                        </span>

                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <Lock className="w-3 h-3" />

                          Encrypted
                        </span>
                      </div>

                      <p className="text-xs text-[#8B756A] font-medium leading-relaxed">
                        {j.content}
                      </p>

                      <div className="flex justify-between items-center text-[10px] text-[#8B756A] border-t border-[#EADCD1] pt-2 mt-2 font-medium">
                        <span>
                          Date: {j.date}
                        </span>

                        <span>
                          Mood: {j.mood || 'Serene'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================
              AI ASSISTANT
          ================================================== */}

          {activeSubTab === 'ai_assistant' && (
            <div className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs flex flex-col h-[520px]">
              <div className="flex items-center gap-3 pb-3 border-b border-[#EADCD1]">
                <div className="w-10 h-10 rounded-2xl bg-[#F7EAE2] border border-[#EADCD1] flex items-center justify-center text-[#B76A4B]">
                  <Bot className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="font-serif font-extrabold text-base text-[#4D2D22]">
                    Mathreya Adolescent AI Chatbot
                  </h3>

                  <p className="text-xs text-[#8B756A]">
                    Empathetic advice on period health,
                    hygiene, & growth
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                {chatMessages.map(
                  (msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.sender === 'user'
                          ? 'justify-end'
                          : 'justify-start'
                        }`}
                    >
                      <div
                        className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${msg.sender === 'user'
                            ? 'bg-[#B76A4B] text-white font-medium rounded-tr-none'
                            : 'bg-[#FFF8F5] text-[#4D2D22] rounded-tl-none border border-[#EADCD1]'
                          }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  )
                )}
              </div>

              <form
                onSubmit={handleSendAiMessage}
                className="pt-3 border-t border-[#EADCD1] flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) =>
                    setChatInput(
                      e.target.value
                    )
                  }
                  placeholder="Ask anything about period hygiene, cramps, or mood..."
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                />

                <button
                  type="submit"
                  disabled={
                    isAiLoading ||
                    !chatInput.trim()
                  }
                  className="px-4 py-2.5 bg-[#B76A4B] hover:bg-[#A05A3B] text-white font-bold text-xs rounded-2xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />

                  Send
                </button>
              </form>
            </div>
          )}

          {/* ==================================================
              MEDIA LIBRARY
          ================================================== */}

          {activeSubTab === 'media' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="font-serif font-extrabold text-base text-[#4D2D22]">
                  Adolescent Health Media Library
                </h3>

                <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-[#EADCD1]">
                  {(
                    [
                      'all',
                      'audio',
                      'video',
                      'articles',
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setMediaFilter(cat)
                      }
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {INITIAL_MEDIA
                  .filter(
                    (m) =>
                      mediaFilter ===
                      'all' ||
                      m.category ===
                      mediaFilter
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-[28px] border border-[#EADCD1] overflow-hidden shadow-2xs flex flex-col"
                    >
                      <div className="h-36 relative bg-[#FFF8F5]">
                        <img
                          src={
                            item.thumbnailUrl
                          }
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />

                        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                          {item.category ===
                            'audio' && (
                              <Volume2 className="w-3 h-3 text-amber-200" />
                            )}

                          {item.category ===
                            'video' && (
                              <Video className="w-3 h-3 text-cyan-200" />
                            )}

                          {item.category ===
                            'articles' && (
                              <BookOpen className="w-3 h-3 text-rose-200" />
                            )}

                          {item.category}
                        </span>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <h4 className="font-serif font-bold text-sm text-[#4D2D22]">
                            {item.title}
                          </h4>

                          <p className="text-xs text-[#8B756A] line-clamp-2 mt-0.5 font-medium">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#8B756A] border-t border-[#EADCD1] pt-2 font-semibold">
                          <span>
                            {item.duration ||
                              item.readTime}
                          </span>

                          <button className="px-3 py-1 bg-[#FFF8F5] text-[#B76A4B] border border-[#EADCD1] hover:bg-[#B76A4B] hover:text-white rounded-xl text-xs font-extrabold transition cursor-pointer">
                            Explore
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ==================================================
              COMMUNITY
          ================================================== */}

          {activeSubTab === 'community' && (
            <div className="space-y-3">
              <div className="bg-[#FFF8F5] p-3.5 rounded-2xl border border-[#EADCD1] text-xs text-[#4D2D22] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />

                <span className="font-medium">
                  Monitored Safe Forum: Moderated
                  by certified health mentors.
                </span>
              </div>

              <div className="space-y-3">
                {INITIAL_COMMUNITY_POSTS.map(
                  (post) => (
                    <div
                      key={post.id}
                      className="bg-white p-4.5 rounded-[28px] border border-[#EADCD1] shadow-2xs space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#F7EAE2] text-[#B76A4B] font-bold flex items-center justify-center text-xs border border-[#EADCD1]">
                            {
                              post
                                .authorName[0]
                            }
                          </div>

                          <div>
                            <h4 className="font-serif font-bold text-xs text-[#4D2D22]">
                              {
                                post.authorName
                              }
                            </h4>

                            <span className="text-[10px] text-[#8B756A]">
                              {
                                post.ageGroup
                              }{' '}
                              •{' '}
                              {post.date}
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[9px] font-bold border border-emerald-200">
                          Verified Safe
                        </span>
                      </div>

                      <h5 className="font-bold text-xs text-[#4D2D22]">
                        {post.title}
                      </h5>

                      <p className="text-xs text-[#8B756A] font-medium leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* ==================================================
              SOCIALS & HYGIENE
          ================================================== */}

          {activeSubTab === 'socials' && (
            <div className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-rose-800 bg-rose-50 px-3 py-1 rounded-2xl border border-rose-200 text-xs font-extrabold w-fit">
                <Share2 className="w-4 h-4 text-rose-600" />

                Social Awareness & Menstrual Hygiene
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="bg-[#FFF8F5] p-4 rounded-2xl border border-[#EADCD1] space-y-1.5">
                  <h4 className="font-serif font-bold text-sm text-[#4D2D22]">
                    Myth Buster: Exercise During Flow
                  </h4>

                  <p className="text-xs text-[#8B756A] font-medium leading-relaxed">
                    Light stretches and yoga improve
                    pelvic blood flow and naturally ease
                    cramps. Periods are not a restriction
                    on physical activity!
                  </p>
                </div>

                <div className="bg-[#FFF8F5] p-4 rounded-2xl border border-[#EADCD1] space-y-1.5">
                  <h4 className="font-serif font-bold text-sm text-[#4D2D22]">
                    Sustainable Hygiene Products
                  </h4>

                  <p className="text-xs text-[#8B756A] font-medium leading-relaxed">
                    Learn about organic cotton pads,
                    menstrual cups, and eco-friendly
                    disposable options tailored for
                    adolescent comfort.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================
              MENTORSHIP
          ================================================== */}

          {activeSubTab === 'mentorship' && (
            <div className="bg-white p-5 sm:p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-5">
              <div className="text-center max-w-xl mx-auto space-y-1.5">
                <HeartHandshake className="w-8 h-8 text-[#B76A4B] mx-auto" />

                <h3 className="font-serif font-extrabold text-lg text-[#4D2D22]">
                  Big Sister Mentorship Circle
                </h3>

                <p className="text-xs text-[#8B756A] font-medium">
                  Connect 1-on-1 with verified sister
                  mentors who provide advice on body
                  confidence, period hygiene, & growth.
                </p>
              </div>

              <div className="flex justify-center gap-2">
                <button
                  onClick={() =>
                    setMentorshipRole(
                      'mentee'
                    )
                  }
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition border cursor-pointer ${mentorshipRole ===
                      'mentee'
                      ? 'bg-[#B76A4B] text-white border-[#B76A4B] shadow-2xs'
                      : 'bg-[#FFF8F5] text-[#4D2D22] border-[#EADCD1]'
                    }`}
                >
                  Mentee (I Want Guidance)
                </button>

                <button
                  onClick={() =>
                    setMentorshipRole(
                      'mentor'
                    )
                  }
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition border cursor-pointer ${mentorshipRole ===
                      'mentor'
                      ? 'bg-[#B76A4B] text-white border-[#B76A4B] shadow-2xs'
                      : 'bg-[#FFF8F5] text-[#4D2D22] border-[#EADCD1]'
                    }`}
                >
                  Mentor (I Want to Guide)
                </button>
              </div>

              <div className="bg-[#FFF8F5] p-5 rounded-[28px] border border-[#EADCD1] text-center space-y-3">
                <h4 className="font-serif font-bold text-sm text-[#4D2D22]">
                  Recommended Sister Mentor
                </h4>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto bg-white p-3.5 rounded-2xl border border-[#EADCD1]">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80"
                    alt="Mentor Swati"
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#B76A4B]"
                  />

                  <div className="text-left">
                    <h5 className="font-bold text-xs text-[#4D2D22]">
                      Dr. Swati Sen (28 yrs)
                    </h5>

                    <p className="text-[11px] text-[#8B756A]">
                      Adolescent Mentor & Big Sister
                    </p>

                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold mt-0.5 inline-block">
                      ★ 4.9 Rating (120+ Mentees)
                    </span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setMatchedMentor(
                      true
                    )
                  }
                  className="px-5 py-2.5 bg-[#B76A4B] hover:bg-[#A05A3B] text-white font-bold text-xs rounded-2xl transition shadow-2xs cursor-pointer"
                >
                  {matchedMentor
                    ? 'Connected! Send Message'
                    : 'Request 1-on-1 Sister Session'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};