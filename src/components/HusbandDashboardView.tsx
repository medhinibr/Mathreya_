import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { HusbandTask, BabyName } from '../types';

import {
  INITIAL_HUSBAND_TASKS,
  INITIAL_MEDICAL_DOCS,
  INITIAL_BABY_NAMES,
} from '../data';

import {
  CheckSquare,
  FileText,
  Heart,
  Plus,
  Search,
  Star,
  ShieldAlert,
  Download,
  MessageCircle,
  Sparkles,
  BookOpen,
  Film,
  Music,
  UserCheck,
  Send,
  AlertTriangle,
  X,
} from 'lucide-react';

import { triggerHapticFeedback } from '../utils/haptics';
import { useAuth } from '../auth/useAuth';

import {
  getUserHusbandTasks,
  createHusbandTask,
  updateHusbandTaskStatus,
  getUserMedicalRecords,
  createMedicalRecord,
  deleteMedicalRecord,
  MedicalRecordData,
  getUserChatMessages,
  createChatMessage,
  ChatMessageData,
  getUserBabyNameFavourites,
  createBabyNameFavourite,
  deleteBabyNameFavourite,
} from '../lib/appwrite';

interface HusbandDashboardViewProps {
  fontSizeClass: string;
  highContrast: boolean;
}

type PartnerChatMessage = {
  id?: string;
  sender: 'husband' | 'bot';
  text: string;
};

export const HusbandDashboardView: React.FC<
  HusbandDashboardViewProps
> = ({ fontSizeClass, highContrast }) => {
  const { appwriteUser } = useAuth();
  const userId = appwriteUser?.$id || '';

  const [activeTab, setActiveTab] = useState<
    | 'consultation'
    | 'chat'
    | 'media'
    | 'medical_vault'
    | 'name_generator'
    | 'sim'
    | 'emergency'
  >('consultation');

  // ============================================================
  // HUSBAND TASKS
  // ============================================================

  const [tasks, setTasks] =
    useState<HusbandTask[]>(INITIAL_HUSBAND_TASKS);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);

  // ============================================================
  // PARTNER CHAT - APPWRITE
  // ============================================================

  const [partnerChatInput, setPartnerChatInput] = useState('');

  const [partnerChatMessages, setPartnerChatMessages] =
    useState<PartnerChatMessage[]>([]);

  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatSaving, setChatSaving] = useState(false);

  // ============================================================
  // MEDIA
  // ============================================================

  const [mediaFilter, setMediaFilter] = useState<
    'audio' | 'video' | 'articles'
  >('audio');

  // ============================================================
  // BABY NAMES
  // ============================================================

  const [babyNames, setBabyNames] =
    useState<BabyName[]>(INITIAL_BABY_NAMES);

  const [babyNameFavouriteIds, setBabyNameFavouriteIds] =
    useState<Record<string, string>>({});

  const [nameSearch, setNameSearch] = useState('');

  const [genderFilter, setGenderFilter] = useState<
    'all' | 'girl' | 'boy'
  >('all');

  // ============================================================
  // BABY NAME FAVOURITES - LOAD FROM APPWRITE
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const loadBabyNameFavourites = async () => {
      if (!userId) {
        setBabyNames(INITIAL_BABY_NAMES);
        setBabyNameFavouriteIds({});
        return;
      }

      try {
        const savedFavourites =
          await getUserBabyNameFavourites(userId);

        if (cancelled) return;

        const favouriteIds: Record<string, string> = {};

        savedFavourites.forEach((favourite) => {
          if (favourite.nameId && favourite.id) {
            favouriteIds[favourite.nameId] =
              favourite.id;
          }
        });

        setBabyNameFavouriteIds(favouriteIds);

        setBabyNames(
          INITIAL_BABY_NAMES.map((baby) => ({
            ...baby,
            isFavorite: Boolean(
              favouriteIds[baby.id]
            ),
          }))
        );
      } catch (error) {
        console.error(
          '[Husband Dashboard] Failed to load baby name favourites:',
          error
        );
      }
    };

    void loadBabyNameFavourites();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ============================================================
  // EMERGENCY
  // ============================================================

  const [sosTriggered, setSosTriggered] = useState(false);

  // ============================================================
  // MEDICAL VAULT - APPWRITE
  // ============================================================

  const [medicalRecords, setMedicalRecords] = useState<
    MedicalRecordData[]
  >([]);

  const [isMedicalLoading, setIsMedicalLoading] =
    useState(false);

  const [medicalSaving, setMedicalSaving] =
    useState(false);

  const [showMedicalForm, setShowMedicalForm] =
    useState(false);

  const [medicalTitle, setMedicalTitle] = useState('');
  const [medicalType, setMedicalType] = useState('Report');
  const [medicalDoctor, setMedicalDoctor] = useState('');
  const [medicalHospital, setMedicalHospital] = useState('');
  const [medicalDate, setMedicalDate] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // ============================================================
  // HUSBAND TASKS - LOAD FROM APPWRITE
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const loadTasks = async () => {
      if (!userId) {
        setTasks([]);
        setIsTasksLoading(false);
        return;
      }

      setIsTasksLoading(true);

      try {
        const savedTasks =
          await getUserHusbandTasks(userId);

        if (cancelled) return;

        if (savedTasks.length > 0) {
          setTasks(savedTasks);
          return;
        }

        // First-time user: seed the existing demo tasks.
        const seededTasks = await Promise.all(
          INITIAL_HUSBAND_TASKS.map((task) =>
            createHusbandTask({
              userId,
              title: task.title,
              category: task.category,
              dueDate: task.dueDate,
              isCompleted: task.isCompleted,
              priority: task.priority,
            })
          )
        );

        const successfulSeeds = seededTasks.filter(
          (task): task is HusbandTask => task !== null
        );

        if (cancelled) return;

        if (successfulSeeds.length > 0) {
          setTasks(successfulSeeds);
        } else {
          setTasks(INITIAL_HUSBAND_TASKS);
        }
      } catch (error) {
        console.error(
          '[Husband Dashboard] Failed to load tasks:',
          error
        );

        if (!cancelled) {
          setTasks(INITIAL_HUSBAND_TASKS);
        }
      } finally {
        if (!cancelled) {
          setIsTasksLoading(false);
        }
      }
    };

    void loadTasks();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ============================================================
  // MEDICAL VAULT - LOAD FROM APPWRITE
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const loadMedicalRecords = async () => {
      if (!userId) {
        setMedicalRecords([]);
        setIsMedicalLoading(false);
        return;
      }

      setIsMedicalLoading(true);

      try {
        const savedRecords =
          await getUserMedicalRecords(userId);

        if (cancelled) return;

        if (savedRecords.length > 0) {
          setMedicalRecords(savedRecords);
          return;
        }

        // First-time user: seed demo records.
        const seededRecords = await Promise.all(
          INITIAL_MEDICAL_DOCS.map((doc) =>
            createMedicalRecord({
              userId,
              title: doc.title,
              recordType: doc.type,
              doctorName: doc.doctorName,
              recordDate: doc.date,
              notes: '',
            })
          )
        );

        const successfulSeeds = seededRecords.filter(
          (record): record is MedicalRecordData =>
            record !== null
        );

        if (cancelled) return;

        setMedicalRecords(successfulSeeds);
      } catch (error) {
        console.error(
          '[Husband Dashboard] Failed to load medical records:',
          error
        );

        if (!cancelled) {
          setMedicalRecords([]);
        }
      } finally {
        if (!cancelled) {
          setIsMedicalLoading(false);
        }
      }
    };

    void loadMedicalRecords();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ============================================================
  // PARTNER CHAT - LOAD FROM APPWRITE
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const loadChatMessages = async () => {
      if (!userId) {
        setPartnerChatMessages([]);
        setIsChatLoading(false);
        return;
      }

      setIsChatLoading(true);

      try {
        const savedMessages =
          await getUserChatMessages(userId);

        if (cancelled) return;

        if (savedMessages.length > 0) {
          const mappedMessages: PartnerChatMessage[] =
            savedMessages.map((message) => ({
              id: message.id,
              sender:
                message.sender === 'bot'
                  ? 'bot'
                  : 'husband',
              text: message.message,
            }));

          setPartnerChatMessages(mappedMessages);
        } else {
          // First-time chat greeting.
          const greeting =
            'Namaste! I am your Birthing Partner AI Guide. How can I help you support Ananya today?';

          setPartnerChatMessages([
            {
              sender: 'bot',
              text: greeting,
            },
          ]);

          // Save greeting to Appwrite so it remains after refresh.
          const savedGreeting =
            await createChatMessage({
              userId,
              sender: 'bot',
              message: greeting,
              messageType: 'text',
            });

          if (
            savedGreeting &&
            !cancelled
          ) {
            setPartnerChatMessages([
              {
                id: savedGreeting.id,
                sender: 'bot',
                text: greeting,
              },
            ]);
          }
        }
      } catch (error) {
        console.error(
          '[Husband Dashboard] Failed to load chat messages:',
          error
        );

        if (!cancelled) {
          setPartnerChatMessages([
            {
              sender: 'bot',
              text:
                'Namaste! I am your Birthing Partner AI Guide. How can I help you support Ananya today?',
            },
          ]);
        }
      } finally {
        if (!cancelled) {
          setIsChatLoading(false);
        }
      }
    };

    void loadChatMessages();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ============================================================
  // TASK TOGGLE
  // ============================================================

  const toggleTask = async (id: string) => {
    triggerHapticFeedback('light');

    const currentTask = tasks.find(
      (task) => task.id === id
    );

    if (!currentTask || taskSaving) {
      return;
    }

    const nextCompleted =
      !currentTask.isCompleted;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
            ...task,
            isCompleted: nextCompleted,
          }
          : task
      )
    );

    if (!userId) {
      return;
    }

    setTaskSaving(true);

    try {
      const updated =
        await updateHusbandTaskStatus(
          id,
          nextCompleted
        );

      if (!updated) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === id
              ? {
                ...task,
                isCompleted:
                  currentTask.isCompleted,
              }
              : task
          )
        );
      }
    } catch (error) {
      console.error(
        '[Husband Dashboard] Failed to update task:',
        error
      );

      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? {
              ...task,
              isCompleted:
                currentTask.isCompleted,
            }
            : task
        )
      );
    } finally {
      setTaskSaving(false);
    }
  };

  // ============================================================
  // ADD TASK
  // ============================================================

  const addTask = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const title =
      newTaskTitle.trim();

    if (
      !title ||
      !userId ||
      taskSaving
    ) {
      return;
    }

    triggerHapticFeedback('medium');
    setTaskSaving(true);

    try {
      const savedTask =
        await createHusbandTask({
          userId,
          title,
          category: 'essentials',
          dueDate: 'Today',
          isCompleted: false,
          priority: 'medium',
        });

      if (savedTask) {
        setTasks((prev) => [
          savedTask,
          ...prev,
        ]);

        setNewTaskTitle('');
      } else {
        console.error(
          '[Husband Dashboard] Appwrite did not create the task.'
        );
      }
    } catch (error) {
      console.error(
        '[Husband Dashboard] Failed to create task:',
        error
      );
    } finally {
      setTaskSaving(false);
    }
  };

  // ============================================================
  // ADD MEDICAL RECORD
  // ============================================================

  const handleAddMedicalRecord = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !userId ||
      medicalSaving
    ) {
      return;
    }

    const title =
      medicalTitle.trim();

    if (
      !title ||
      !medicalDate
    ) {
      return;
    }

    triggerHapticFeedback('medium');
    setMedicalSaving(true);

    try {
      const savedRecord =
        await createMedicalRecord({
          userId,
          title,
          recordType: medicalType,
          doctorName:
            medicalDoctor.trim() ||
            undefined,
          hospitalName:
            medicalHospital.trim() ||
            undefined,
          recordDate: medicalDate,
          notes:
            medicalNotes.trim() ||
            undefined,
        });

      if (savedRecord) {
        setMedicalRecords((prev) => [
          savedRecord,
          ...prev,
        ]);

        setMedicalTitle('');
        setMedicalType('Report');
        setMedicalDoctor('');
        setMedicalHospital('');
        setMedicalDate('');
        setMedicalNotes('');
        setShowMedicalForm(false);
      }
    } catch (error) {
      console.error(
        '[Husband Dashboard] Failed to create medical record:',
        error
      );
    } finally {
      setMedicalSaving(false);
    }
  };

  // ============================================================
  // DELETE MEDICAL RECORD
  // ============================================================

  const handleDeleteMedicalRecord =
    async (id?: string) => {
      if (
        !id ||
        medicalSaving
      ) {
        return;
      }

      triggerHapticFeedback('light');
      setMedicalSaving(true);

      try {
        const deleted =
          await deleteMedicalRecord(id);

        if (deleted) {
          setMedicalRecords((prev) =>
            prev.filter(
              (record) =>
                record.id !== id
            )
          );
        }
      } catch (error) {
        console.error(
          '[Husband Dashboard] Failed to delete medical record:',
          error
        );
      } finally {
        setMedicalSaving(false);
      }
    };

  // ============================================================
  // BABY NAME FAVORITE
  // ============================================================

  const toggleFavoriteName =
    async (id: string) => {
      triggerHapticFeedback('light');

      if (!userId) {
        return;
      }

      const baby = babyNames.find(
        (item) => item.id === id
      );

      if (!baby) {
        return;
      }

      const favouriteDocumentId =
        babyNameFavouriteIds[id];

      if (favouriteDocumentId) {
        const deleted =
          await deleteBabyNameFavourite(
            favouriteDocumentId
          );

        if (!deleted) {
          return;
        }

        setBabyNameFavouriteIds((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });

        setBabyNames((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                ...item,
                isFavorite: false,
              }
              : item
          )
        );

        return;
      }

      const savedFavourite =
        await createBabyNameFavourite({
          userId,
          nameId: baby.id,
          name: baby.name,
          meaning: baby.meaning,
          gender: baby.gender,
          origin: baby.origin,
        });

      if (!savedFavourite?.id) {
        return;
      }

      setBabyNameFavouriteIds((prev) => ({
        ...prev,
        [id]: savedFavourite.id as string,
      }));

      setBabyNames((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
              ...item,
              isFavorite: true,
            }
            : item
        )
      );
    };

  // ============================================================
  // PARTNER CHAT - APPWRITE SAVE
  // ============================================================

  const handleSendPartnerChat =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      const userMsg =
        partnerChatInput.trim();

      if (
        !userMsg ||
        !userId ||
        chatSaving ||
        isChatLoading
      ) {
        return;
      }

      triggerHapticFeedback('light');

      setChatSaving(true);

      try {
        // ------------------------------------------------------
        // 1. Save husband's message
        // ------------------------------------------------------

        const savedUserMessage =
          await createChatMessage({
            userId,
            sender: 'husband',
            message: userMsg,
            messageType: 'text',
          });

        if (!savedUserMessage) {
          console.error(
            '[Husband Dashboard] Failed to save husband chat message.'
          );
          return;
        }

        setPartnerChatMessages(
          (prev) => [
            ...prev,
            {
              id:
                savedUserMessage.id,
              sender: 'husband',
              text: userMsg,
            },
          ]
        );

        setPartnerChatInput('');

        // ------------------------------------------------------
        // 2. Generate existing demo AI response
        // ------------------------------------------------------

        const botResponse =
          'Remember to offer her warm ajwain water and encourage a 15-minute gentle evening walk together.';

        // Small delay keeps the existing chat behaviour.
        await new Promise<void>(
          (resolve) =>
            window.setTimeout(
              resolve,
              700
            )
        );

        // ------------------------------------------------------
        // 3. Save bot response
        // ------------------------------------------------------

        const savedBotMessage =
          await createChatMessage({
            userId,
            sender: 'bot',
            message: botResponse,
            messageType: 'text',
          });

        if (savedBotMessage) {
          setPartnerChatMessages(
            (prev) => [
              ...prev,
              {
                id:
                  savedBotMessage.id,
                sender: 'bot',
                text: botResponse,
              },
            ]
          );
        } else {
          // If the bot response could not be saved,
          // still show it in the current session.
          setPartnerChatMessages(
            (prev) => [
              ...prev,
              {
                sender: 'bot',
                text: botResponse,
              },
            ]
          );
        }
      } catch (error) {
        console.error(
          '[Husband Dashboard] Failed to send chat message:',
          error
        );
      } finally {
        setChatSaving(false);
      }
    };

  // ============================================================
  // FILTER BABY NAMES
  // ============================================================

  const filteredNames =
    babyNames.filter((baby) => {
      const search =
        nameSearch.toLowerCase();

      const matchesSearch =
        baby.name
          .toLowerCase()
          .includes(search) ||
        baby.meaning
          .toLowerCase()
          .includes(search);

      const matchesGender =
        genderFilter === 'all' ||
        baby.gender === genderFilter;

      return (
        matchesSearch &&
        matchesGender
      );
    });

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      className={`space-y-6 ${fontSizeClass} max-w-full sm:max-w-2xl md:max-w-4xl xl:max-w-6xl mx-auto text-[#4D2D22] select-none pb-8`}
    >
      {/* ======================================================
          1. HERO BANNER
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
        className="p-5 sm:p-7 rounded-[32px] bg-gradient-to-br from-[#B76A4B] via-[#C57655] to-[#D48D68] text-white shadow-md space-y-2 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-white/20 text-amber-100 border border-white/30 backdrop-blur-xs uppercase tracking-wider">
                PARTNER MODULE • HUSBAND DASHBOARD
              </span>

              <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-white bg-black/20 px-3 py-0.5 rounded-full border border-white/20 backdrop-blur-xs">
                <Heart className="w-3.5 h-3.5 fill-rose-300 text-rose-300" />
                Live Partner Sync
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-white tracking-tight">
              Husband Care & Assistance Center
            </h2>

            <p className="text-xs sm:text-sm text-white/90 font-medium max-w-2xl mt-1">
              Empowering husbands with consultation reminders, medical document vault, Sanskrit baby names, and instant emergency SOS.
            </p>
          </div>

          <div className="bg-black/20 p-3 rounded-2xl border border-white/30 text-center shrink-0">
            <p className="text-[10px] text-amber-100 font-bold uppercase tracking-wider">
              Partner Status
            </p>

            <p className="text-sm font-extrabold text-white font-serif">
              Ananya • Week 24 Care
            </p>
          </div>
        </div>
      </motion.div>

      {/* ======================================================
          2. 7-NODE GRID
      ====================================================== */}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider font-serif text-[#4D2D22]">
            Husband Dashboard Modules
          </h3>

          <span className="text-[10px] font-bold text-[#8B756A]">
            7 Interactive Pillars
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {[
            {
              id: 'consultation' as const,
              icon: CheckSquare,
              title: 'Reminders',
              subtitle: 'To-do & Bag',
            },
            {
              id: 'chat' as const,
              icon: MessageCircle,
              title: 'Partner Chat',
              subtitle: 'AI Support',
            },
            {
              id: 'media' as const,
              icon: Film,
              title: 'Media Hub',
              subtitle: 'Audio, Video, Reads',
            },
            {
              id: 'medical_vault' as const,
              icon: FileText,
              title: 'Medical Vault',
              subtitle: 'Scans & Reports',
            },
            {
              id: 'name_generator' as const,
              icon: Sparkles,
              title: 'Baby Names',
              subtitle: 'Sanskrit & Nakshatra',
            },
            {
              id: 'sim' as const,
              icon: UserCheck,
              title: 'Partner SIM',
              subtitle: 'Sync & Milestones',
            },
            {
              id: 'emergency' as const,
              icon: ShieldAlert,
              title: 'Emergency',
              subtitle: '1-Tap SOS',
            },
          ].map((node) => {
            const Icon = node.icon;
            const isEmergency =
              node.id === 'emergency';
            const isActive =
              activeTab === node.id;

            return (
              <motion.button
                key={node.id}
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale: 0.96,
                }}
                onClick={() => {
                  triggerHapticFeedback(
                    'light'
                  );
                  setActiveTab(node.id);
                }}
                className={`p-3.5 rounded-2xl text-left border transition cursor-pointer flex flex-col justify-between space-y-2 ${isEmergency
                  ? isActive
                    ? 'bg-rose-600 border-2 border-rose-700 text-white shadow-2xs font-bold col-span-2 sm:col-span-1'
                    : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100 shadow-2xs col-span-2 sm:col-span-1'
                  : isActive
                    ? 'bg-[#F7EAE2] border-2 border-[#B76A4B] text-[#B76A4B] shadow-2xs font-bold'
                    : 'bg-white border-[#EADCD1] text-[#4D2D22] hover:border-[#B76A4B]/40 shadow-2xs'
                  }`}
              >
                <div
                  className={`p-2 rounded-xl w-fit ${isEmergency
                    ? isActive
                      ? 'bg-white text-rose-600'
                      : 'bg-rose-200 text-rose-800'
                    : isActive
                      ? 'bg-[#B76A4B] text-white'
                      : 'bg-[#FFF8F5] text-[#B76A4B]'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div>
                  <p className="text-xs font-serif font-extrabold leading-tight">
                    {node.title}
                  </p>

                  <span
                    className={`text-[9px] font-medium block ${isEmergency
                      ? isActive
                        ? 'text-rose-100'
                        : 'text-rose-600'
                      : 'text-[#8B756A]'
                      }`}
                  >
                    {node.subtitle}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ======================================================
          3. ACTIVE PILLAR
      ====================================================== */}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
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
            duration: 0.22,
          }}
        >
          {/* ==================================================
              PILLAR 1 - CONSULTATION
          ================================================== */}

          {activeTab === 'consultation' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-4">
                <h3 className="font-serif font-extrabold text-lg text-[#4D2D22]">
                  Partner Daily To-Do Checklist
                </h3>

                <form
                  onSubmit={addTask}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) =>
                      setNewTaskTitle(
                        e.target.value
                      )
                    }
                    placeholder="Add task (e.g. Purchase Folic Acid, book 3D Scan, prepare bag)..."
                    className="flex-1 px-4 py-3 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                  />

                  <button
                    type="submit"
                    disabled={
                      taskSaving ||
                      isTasksLoading ||
                      !userId
                    }
                    className="px-5 py-3 bg-[#B76A4B] hover:bg-[#A05A3B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-2xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {taskSaving
                      ? 'Saving...'
                      : 'Add Task'}
                  </button>
                </form>

                <div className="space-y-2.5 pt-2">
                  {isTasksLoading && (
                    <div className="text-xs text-[#8B756A] font-medium py-3">
                      Loading saved tasks...
                    </div>
                  )}

                  {!isTasksLoading &&
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() =>
                          void toggleTask(
                            task.id
                          )
                        }
                        className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${task.isCompleted
                          ? 'bg-[#FFF8F5] border-[#EADCD1] text-[#8B756A] line-through'
                          : 'bg-white border-[#EADCD1] text-[#4D2D22] hover:bg-[#FFF8F5]'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={
                              task.isCompleted
                            }
                            onChange={() => { }}
                            className="w-4 h-4 text-[#B76A4B] rounded-md"
                          />

                          <div>
                            <p className="font-extrabold text-xs">
                              {task.title}
                            </p>

                            <span className="text-[10px] text-[#8B756A]">
                              Due: {task.dueDate}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${task.priority ===
                            'high'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-stone-100 text-stone-600'
                            }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-4">
                <h4 className="font-serif font-extrabold text-base text-[#4D2D22]">
                  Hospital Bag Essentials Guide
                </h4>

                <ul className="text-xs text-[#8B756A] space-y-3 font-medium">
                  {[
                    'Doctor Prescriptions & Medical File Folder',
                    'Government ID Cards & Health Insurance Copy',
                    '2 Pairs Loose Cotton Clothes for Mother',
                    'Soft Baby Blankets, Caps & Mittens',
                    'Warm Thermos with Ajwain Herbal Tea',
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2"
                    >
                      <span className="text-[#B76A4B]">
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ==================================================
              PILLAR 2 - CHAT
          ================================================== */}

          {activeTab === 'chat' && (
            <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-4 max-w-3xl mx-auto">
              <div className="flex justify-between items-center border-b border-[#EADCD1] pb-3">
                <h3 className="font-serif font-extrabold text-base text-[#4D2D22] flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#B76A4B]" />
                  Birthing Partner AI Guide
                </h3>

                <span className="text-[10px] text-[#8B756A]">
                  Empathic Couple Support
                </span>
              </div>

              <div className="h-64 overflow-y-auto space-y-3 p-3 bg-[#FFF8F5] rounded-2xl border border-[#EADCD1]">
                {isChatLoading && (
                  <div className="text-xs text-[#8B756A] font-medium text-center py-3">
                    Loading saved chat...
                  </div>
                )}

                {!isChatLoading &&
                  partnerChatMessages.map(
                    (msg, idx) => (
                      <div
                        key={
                          msg.id ??
                          `${msg.sender}-${idx}`
                        }
                        className={`flex ${msg.sender ===
                          'husband'
                          ? 'justify-end'
                          : 'justify-start'
                          }`}
                      >
                        <div
                          className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${msg.sender ===
                            'husband'
                            ? 'bg-[#B76A4B] text-white rounded-tr-none font-medium'
                            : 'bg-white text-[#4D2D22] rounded-tl-none border border-[#EADCD1] shadow-2xs font-serif'
                            }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    )
                  )}
              </div>

              <form
                onSubmit={
                  handleSendPartnerChat
                }
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={partnerChatInput}
                  onChange={(e) =>
                    setPartnerChatInput(
                      e.target.value
                    )
                  }
                  disabled={
                    isChatLoading ||
                    chatSaving ||
                    !userId
                  }
                  placeholder="Ask how to support your partner today..."
                  className="flex-1 px-4 py-3 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={
                    isChatLoading ||
                    chatSaving ||
                    !userId ||
                    !partnerChatInput.trim()
                  }
                  className="px-5 py-3 bg-[#B76A4B] hover:bg-[#A05A3B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-2xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {chatSaving
                    ? 'Sending...'
                    : 'Send'}
                </button>
              </form>
            </div>
          )}

          {/* ==================================================
              PILLAR 3 - MEDIA
          ================================================== */}

          {activeTab === 'media' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-[#EADCD1] pb-3">
                {[
                  {
                    id: 'audio',
                    label: 'Couple Audio Ragas',
                    icon: Music,
                  },
                  {
                    id: 'video',
                    label: 'Birthing Partner Videos',
                    icon: Film,
                  },
                  {
                    id: 'articles',
                    label: 'Paternal Care Guides',
                    icon: BookOpen,
                  },
                ].map((media) => {
                  const Icon =
                    media.icon;

                  const isActive =
                    mediaFilter ===
                    media.id;

                  return (
                    <button
                      key={media.id}
                      onClick={() =>
                        setMediaFilter(
                          media.id as
                          | 'audio'
                          | 'video'
                          | 'articles'
                        )
                      }
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-extrabold transition cursor-pointer ${isActive
                        ? 'bg-[#B76A4B] text-white shadow-2xs'
                        : 'bg-white text-[#4D2D22] hover:bg-[#FFF8F5] border border-[#EADCD1]'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>
                        {media.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {mediaFilter ===
                  'audio' && (
                    <>
                      <div className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-3">
                        <div className="p-3 bg-amber-50 text-amber-800 rounded-2xl w-fit">
                          <Music className="w-5 h-5" />
                        </div>

                        <h4 className="font-serif font-bold text-base text-[#4D2D22]">
                          Garbh Sanskar Evening Raga
                        </h4>

                        <p className="text-xs text-[#8B756A]">
                          Traditional Sitar & Flute composition for couples relaxation.
                        </p>

                        <button className="px-4 py-2 bg-[#B76A4B] text-white rounded-xl text-xs font-extrabold">
                          Play Audio (12m)
                        </button>
                      </div>

                      <div className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-3">
                        <div className="p-3 bg-rose-50 text-rose-800 rounded-2xl w-fit">
                          <Music className="w-5 h-5" />
                        </div>

                        <h4 className="font-serif font-bold text-base text-[#4D2D22]">
                          Vedic Chants for Baby Growth
                        </h4>

                        <p className="text-xs text-[#8B756A]">
                          Peaceful chants for father to recite aloud near bump.
                        </p>

                        <button className="px-4 py-2 bg-[#B76A4B] text-white rounded-xl text-xs font-extrabold">
                          Play Audio (15m)
                        </button>
                      </div>
                    </>
                  )}

                {mediaFilter ===
                  'video' && (
                    <div className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-3">
                      <div className="p-3 bg-sky-50 text-sky-800 rounded-2xl w-fit">
                        <Film className="w-5 h-5" />
                      </div>

                      <h4 className="font-serif font-bold text-base text-[#4D2D22]">
                        Lower Back Massage Technique
                      </h4>

                      <p className="text-xs text-[#8B756A]">
                        Step-by-step video guide for husband to relieve wife's back tension.
                      </p>

                      <button className="px-4 py-2 bg-sky-700 text-white rounded-xl text-xs font-extrabold">
                        Watch Video (8m)
                      </button>
                    </div>
                  )}

                {mediaFilter ===
                  'articles' && (
                    <div className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-3">
                      <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl w-fit">
                        <BookOpen className="w-5 h-5" />
                      </div>

                      <h4 className="font-serif font-bold text-base text-[#4D2D22]">
                        Understanding Trimester Mood Swings
                      </h4>

                      <p className="text-xs text-[#8B756A]">
                        Essential guide for husbands on emotional reassurance & hormones.
                      </p>

                      <button className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-extrabold">
                        Read Article (4m)
                      </button>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* ==================================================
              PILLAR 4 - MEDICAL VAULT
          ================================================== */}

          {activeTab ===
            'medical_vault' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif font-extrabold text-lg text-[#4D2D22]">
                    Encrypted Medical Document Vault
                  </h3>

                  <button
                    onClick={() => {
                      triggerHapticFeedback(
                        'light'
                      );
                      setShowMedicalForm(
                        true
                      );
                    }}
                    className="px-4 py-2 bg-[#B76A4B] text-white rounded-2xl text-xs font-extrabold shadow-2xs hover:bg-[#A05A3B] transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Upload New Report
                  </button>
                </div>

                {showMedicalForm && (
                  <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h4 className="font-serif font-extrabold text-base text-[#4D2D22]">
                          Add Medical Report
                        </h4>

                        <p className="text-[10px] text-[#8B756A] mt-1">
                          Save the medical record details securely.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setShowMedicalForm(
                            false
                          )
                        }
                        className="p-2 rounded-xl hover:bg-[#FFF8F5] cursor-pointer"
                      >
                        <X className="w-4 h-4 text-[#8B756A]" />
                      </button>
                    </div>

                    <form
                      onSubmit={
                        handleAddMedicalRecord
                      }
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div>
                        <label className="block text-[10px] font-extrabold text-[#4D2D22] mb-1.5">
                          Report Title *
                        </label>

                        <input
                          type="text"
                          value={
                            medicalTitle
                          }
                          onChange={(e) =>
                            setMedicalTitle(
                              e.target
                                .value
                            )
                          }
                          placeholder="e.g. Blood Test Report"
                          required
                          className="w-full px-4 py-3 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-[#4D2D22] mb-1.5">
                          Report Type
                        </label>

                        <select
                          value={
                            medicalType
                          }
                          onChange={(e) =>
                            setMedicalType(
                              e.target
                                .value
                            )
                          }
                          className="w-full px-4 py-3 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden bg-white"
                        >
                          <option value="Report">
                            Report
                          </option>
                          <option value="Blood Test">
                            Blood Test
                          </option>
                          <option value="Scan">
                            Scan
                          </option>
                          <option value="Prescription">
                            Prescription
                          </option>
                          <option value="Ultrasound">
                            Ultrasound
                          </option>
                          <option value="Consultation">
                            Consultation
                          </option>
                          <option value="Other">
                            Other
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-[#4D2D22] mb-1.5">
                          Doctor Name
                        </label>

                        <input
                          type="text"
                          value={
                            medicalDoctor
                          }
                          onChange={(e) =>
                            setMedicalDoctor(
                              e.target
                                .value
                            )
                          }
                          placeholder="Doctor name"
                          className="w-full px-4 py-3 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-[#4D2D22] mb-1.5">
                          Hospital Name
                        </label>

                        <input
                          type="text"
                          value={
                            medicalHospital
                          }
                          onChange={(e) =>
                            setMedicalHospital(
                              e.target
                                .value
                            )
                          }
                          placeholder="Hospital name"
                          className="w-full px-4 py-3 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-[#4D2D22] mb-1.5">
                          Record Date *
                        </label>

                        <input
                          type="date"
                          value={
                            medicalDate
                          }
                          onChange={(e) =>
                            setMedicalDate(
                              e.target
                                .value
                            )
                          }
                          required
                          className="w-full px-4 py-3 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-[#4D2D22] mb-1.5">
                          Notes
                        </label>

                        <input
                          type="text"
                          value={
                            medicalNotes
                          }
                          onChange={(e) =>
                            setMedicalNotes(
                              e.target
                                .value
                            )
                          }
                          placeholder="Optional notes"
                          className="w-full px-4 py-3 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                        />
                      </div>

                      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setShowMedicalForm(
                              false
                            )
                          }
                          className="px-5 py-3 rounded-2xl border border-[#EADCD1] text-[#4D2D22] text-xs font-extrabold cursor-pointer"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={
                            medicalSaving ||
                            !userId
                          }
                          className="px-5 py-3 bg-[#B76A4B] text-white rounded-2xl text-xs font-extrabold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {medicalSaving
                            ? 'Saving...'
                            : 'Save Report'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {isMedicalLoading && (
                  <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] text-xs text-[#8B756A] font-medium">
                    Loading saved medical records...
                  </div>
                )}

                {!isMedicalLoading &&
                  medicalRecords.length ===
                  0 && (
                    <div className="bg-white p-8 rounded-[32px] border border-[#EADCD1] text-center">
                      <FileText className="w-10 h-10 mx-auto text-[#B76A4B] mb-3" />

                      <h4 className="font-serif font-extrabold text-base text-[#4D2D22]">
                        No Medical Reports Yet
                      </h4>

                      <p className="text-xs text-[#8B756A] mt-1">
                        Add your first medical report to the secure vault.
                      </p>
                    </div>
                  )}

                {!isMedicalLoading &&
                  medicalRecords.length >
                  0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {medicalRecords.map(
                        (doc) => (
                          <div
                            key={doc.id}
                            className="bg-white p-5 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-3"
                          >
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-100 text-teal-900 px-3 py-1 rounded-full border border-teal-200">
                                {
                                  doc.recordType
                                }
                              </span>

                              <span className="text-xs text-[#8B756A] font-medium">
                                {
                                  doc.recordDate
                                }
                              </span>
                            </div>

                            <h4 className="font-serif font-bold text-base text-[#4D2D22]">
                              {doc.title}
                            </h4>

                            {doc.doctorName && (
                              <p className="text-xs text-[#8B756A] font-medium">
                                {
                                  doc.doctorName
                                }
                              </p>
                            )}

                            {doc.hospitalName && (
                              <p className="text-[10px] text-[#8B756A]">
                                {
                                  doc.hospitalName
                                }
                              </p>
                            )}

                            {doc.notes && (
                              <p className="text-[10px] text-[#8B756A]">
                                {doc.notes}
                              </p>
                            )}

                            <div className="flex justify-between items-center border-t border-[#EADCD1] pt-3 text-xs text-[#8B756A] gap-2">
                              <span>
                                {doc.fileId
                                  ? 'File attached'
                                  : 'Record saved'}
                              </span>

                              <div className="flex items-center gap-3">
                                {doc.fileId && (
                                  <button
                                    type="button"
                                    className="flex items-center gap-1 font-extrabold text-[#B76A4B] hover:underline cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Download PDF
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={
                                    medicalSaving
                                  }
                                  onClick={() =>
                                    void handleDeleteMedicalRecord(
                                      doc.id
                                    )
                                  }
                                  className="text-[10px] font-extrabold text-rose-600 hover:underline disabled:opacity-50 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            )}

          {/* ==================================================
              PILLAR 5 - BABY NAMES
          ================================================== */}

          {activeTab ===
            'name_generator' && (
              <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-serif font-extrabold text-xl text-[#4D2D22]">
                      Indian Traditional Baby Name Finder
                    </h3>

                    <p className="text-xs text-[#8B756A] font-medium">
                      Discover Sanskrit origins, Nakshatra, Rashi, and meaningful names
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {(
                      [
                        'all',
                        'girl',
                        'boy',
                      ] as const
                    ).map((gender) => (
                      <button
                        key={gender}
                        onClick={() =>
                          setGenderFilter(
                            gender
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize transition cursor-pointer ${genderFilter ===
                          gender
                          ? 'bg-[#B76A4B] text-white shadow-2xs'
                          : 'bg-[#FFF8F5] text-[#4D2D22] border border-[#EADCD1]'
                          }`}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-[#8B756A] absolute left-3.5 top-3" />

                  <input
                    type="text"
                    value={nameSearch}
                    onChange={(e) =>
                      setNameSearch(
                        e.target.value
                      )
                    }
                    placeholder="Search by name, Sanskrit meaning, or Nakshatra..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#EADCD1] text-xs focus:ring-2 focus:ring-[#B76A4B] focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNames.map(
                    (name) => (
                      <div
                        key={name.id}
                        className="p-4 rounded-2xl bg-[#FFF8F5] border border-[#EADCD1] space-y-2 relative"
                      >
                        <button
                          onClick={() =>
                            void toggleFavoriteName(
                              name.id
                            )
                          }
                          className="absolute top-3 right-3 text-amber-500 cursor-pointer"
                        >
                          <Star
                            className={`w-4 h-4 ${name.isFavorite
                              ? 'fill-amber-400'
                              : ''
                              }`}
                          />
                        </button>

                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-extrabold text-lg text-[#4D2D22]">
                            {name.name}
                          </h4>

                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize ${name.gender ===
                              'girl'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-sky-100 text-sky-800'
                              }`}
                          >
                            {name.gender}
                          </span>
                        </div>

                        <p className="text-xs text-[#8B756A] font-serif italic">
                          "{name.meaning}"
                        </p>

                        <div className="text-[11px] text-[#8B756A] space-y-0.5 border-t border-[#EADCD1] pt-2 font-medium">
                          <p>
                            <strong>
                              Origin:
                            </strong>{' '}
                            {name.origin}
                          </p>

                          <p>
                            <strong>
                              Rashi / Nakshatra:
                            </strong>{' '}
                            {name.rashi} •{' '}
                            {name.nakshatra}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* ==================================================
              PILLAR 6 - SIM
          ================================================== */}

          {activeTab === 'sim' && (
            <div className="bg-white p-6 rounded-[32px] border border-[#EADCD1] shadow-2xs space-y-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between border-b border-[#EADCD1] pb-4">
                <div>
                  <h3 className="font-serif font-extrabold text-xl text-[#4D2D22]">
                    Strimata Identity Module (SIM)
                  </h3>

                  <p className="text-xs text-[#8B756A] font-medium">
                    Synchronized partner health telemetry & doctor routing
                  </p>
                </div>

                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-extrabold border border-emerald-200">
                  ✓ Live Synced
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#FFF8F5] border border-[#EADCD1] space-y-1">
                  <p className="text-[10px] text-[#8B756A] font-bold uppercase">
                    Pregnancy Status
                  </p>

                  <p className="font-serif font-extrabold text-base text-[#4D2D22]">
                    Trimester 2 • Week 24
                  </p>

                  <p className="text-xs text-[#8B756A]">
                    Due Date: Nov 18, 2026
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFF8F5] border border-[#EADCD1] space-y-1">
                  <p className="text-[10px] text-[#8B756A] font-bold uppercase">
                    Primary OB-GYN
                  </p>

                  <p className="font-serif font-extrabold text-base text-[#4D2D22]">
                    Dr. Radhika Sharma
                  </p>

                  <p className="text-xs text-[#8B756A]">
                    Cloudnine Hospital, Bengaluru
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================
              PILLAR 7 - EMERGENCY
          ================================================== */}

          {activeTab ===
            'emergency' && (
              <div className="bg-white p-8 rounded-[32px] border-2 border-rose-300 shadow-md text-center space-y-6 max-w-xl mx-auto">
                <AlertTriangle className="w-14 h-14 text-rose-600 mx-auto animate-bounce" />

                <div>
                  <h3 className="font-serif font-extrabold text-2xl text-rose-900">
                    1-Tap Emergency SOS Trigger
                  </h3>

                  <p className="text-xs text-[#8B756A] font-medium mt-1 leading-relaxed">
                    Instantly dispatches ambulance, calls primary OB-GYN hotline, and broadcasts live GPS location to emergency contacts.
                  </p>
                </div>

                {sosTriggered && (
                  <div className="p-4 rounded-2xl bg-rose-600 text-white font-extrabold text-xs space-y-1 shadow-lg">
                    <p>
                      🚨 EMERGENCY BROADCAST ACTIVATED!
                    </p>

                    <p className="font-mono text-[11px]">
                      Contacting Hospital Ambulance & Dr. Radhika...
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    triggerHapticFeedback(
                      'heavy'
                    );
                    setSosTriggered(
                      true
                    );
                  }}
                  className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl transition transform active:scale-95 cursor-pointer"
                >
                  {sosTriggered
                    ? 'ALERT BROADCASTING NOW'
                    : 'TAP HERE FOR IMMEDIATE EMERGENCY HELP'}
                </button>
              </div>
            )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};