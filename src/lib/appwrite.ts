import {
    Client,
    Account,
    ID,
    Databases,
    Permission,
    Role,
    Query,
} from "appwrite";

import { JournalEntry, HusbandTask } from "../types";

/* =========================================================
   APPWRITE CLIENT
========================================================= */

const client = new Client()
    .setEndpoint(
        import.meta.env.VITE_APPWRITE_ENDPOINT ||
        "https://cloud.appwrite.io/v1"
    )
    .setProject(
        import.meta.env.VITE_APPWRITE_PROJECT_ID || ""
    );

export const account = new Account(client);
export const databases = new Databases(client);

/* =========================================================
   DATABASE CONSTANTS
========================================================= */

const DATABASE_ID = "mathreya-26";

const USER_PROFILES_TABLE_ID = "user_profiles";
const JOURNALS_TABLE_ID = "journals";
const PERIOD_LOGS_TABLE_ID = "period_logs";
const HUSBAND_TASKS_TABLE_ID = "husband_tasks";

const APPOINTMENTS_TABLE_ID = "appointments";
const MEDICAL_RECORDS_TABLE_ID = "medical_records";
const NOTIFICATIONS_TABLE_ID = "notifications";
const MEDICATIONS_TABLE_ID = "medications";
const EMERGENCY_CONTACTS_TABLE_ID = "emergency_contacts";
const CHAT_MESSAGES_TABLE_ID = "chat_messages";
const VACCINATIONS_TABLE_ID = "vaccinations";
const BABY_NAME_FAVOURITES_TABLE_ID = "6ab2b446002601402c41";

/* =========================================================
   AUTH & REGISTRATION FLOW
========================================================= */

export async function getCurrentUser() {
    console.log("[AUTH] getCurrentUser");

    try {
        return await account.get();
    } catch {
        console.log("[AUTH] no active session");
        return null;
    }
}

export async function signup(
    email: string,
    password: string,
    name: string,
    lifeStage: string = "pregnancy_prenatal"
) {
    const user = await account.create(
        ID.unique(),
        email,
        password,
        name
    );

    await account.createEmailPasswordSession(
        email,
        password
    );

    const currentUser = await getCurrentUser();

    const activeUserId =
        currentUser?.$id || user.$id;

    if (activeUserId) {
        try {
            await createUserProfile({
                user_id: activeUserId,
                name,
                email,
                phone: "",
                LifeStage: lifeStage,
            });
        } catch (error: any) {
            console.error(
                "[Appwrite Warning] createUserProfile notice:",
                {
                    code: error?.code,
                    type: error?.type,
                    message:
                        error?.message || error,
                }
            );
        }
    }

    return currentUser || user;
}

export async function login(
    email: string,
    password: string
) {
    console.log("[AUTH] login start");

    let currentUser: any = null;

    try {
        currentUser = await account.get();
        console.log("[AUTH] getCurrentUser");
    } catch {
        console.log("[AUTH] no active session");
    }

    if (currentUser) {
        if (
            currentUser.email.toLowerCase() ===
            email.toLowerCase()
        ) {
            console.log("[AUTH] login success");
            return currentUser;
        }
    }

    const session =
        await account.createEmailPasswordSession(
            email,
            password
        );

    console.log(
        "[AUTH] login session created"
    );

    const user = await account.get();

    console.log("[AUTH] login success");

    return user || session;
}

export async function logout() {
    console.log("[AUTH] logout");

    try {
        return await account.deleteSession(
            "current"
        );
    } catch {
        return null;
    }
}

/* =========================================================
   WEBAUTHN / PASSKEY AUTHENTICATION
========================================================= */

export interface PasskeyEntry {
    id: string;
    name: string;
    createdAt: string;
    credentialId: string;
}

/**
 * Registers a new device passkey
 */
export async function registerPasskey(
    deviceName?: string
): Promise<{
    success: boolean;
    passkey?: PasskeyEntry;
    error?: string;
}> {
    if (
        typeof window === "undefined" ||
        !window.PublicKeyCredential
    ) {
        return {
            success: false,
            error:
                "Passkey authentication is not supported by this browser or device.",
        };
    }

    const currentUser =
        await getCurrentUser();

    if (!currentUser) {
        return {
            success: false,
            error:
                "You must be signed in to register a device passkey.",
        };
    }

    try {
        const challenge =
            new Uint8Array(32);

        window.crypto.getRandomValues(
            challenge
        );

        const userIdBytes =
            new TextEncoder().encode(
                currentUser.$id
            );

        const creationOptions: CredentialCreationOptions =
        {
            publicKey: {
                challenge,

                rp: {
                    name:
                        "Mathreya Women Health",

                    id:
                        window.location
                            .hostname ===
                            "localhost"
                            ? "localhost"
                            : window.location
                                .hostname,
                },

                user: {
                    id: userIdBytes,

                    name:
                        currentUser.email ||
                        currentUser.name ||
                        "user@mathreya.com",

                    displayName:
                        currentUser.name ||
                        "Mathreya User",
                },

                pubKeyCredParams: [
                    {
                        alg: -7,
                        type: "public-key",
                    },
                    {
                        alg: -257,
                        type: "public-key",
                    },
                ],

                authenticatorSelection: {
                    authenticatorAttachment:
                        "platform",

                    userVerification:
                        "preferred",

                    residentKey:
                        "preferred",
                },

                timeout: 60000,
            },
        };

        const credential =
            (await navigator.credentials.create(
                creationOptions
            )) as
            | PublicKeyCredential
            | null;

        if (!credential) {
            return {
                success: false,
                error:
                    "Device passkey creation was not completed.",
            };
        }

        const passkeyId =
            credential.id;

        const defaultName =
            navigator.userAgent.includes(
                "iPhone"
            )
                ? "iPhone Face ID / Passkey"
                : navigator.userAgent.includes(
                    "Mac"
                )
                    ? "Mac Touch ID / Passkey"
                    : navigator.userAgent.includes(
                        "Android"
                    )
                        ? "Android Biometrics / Passkey"
                        : "Device Passkey";

        const newPasskey: PasskeyEntry = {
            id: passkeyId,
            name:
                deviceName ||
                defaultName,
            createdAt:
                new Date().toISOString(),
            credentialId:
                passkeyId,
        };

        const prefs =
            (await account.getPrefs()) as Record<
                string,
                unknown
            >;

        const existingPasskeys =
            Array.isArray(
                prefs.passkeys
            )
                ? (prefs.passkeys as PasskeyEntry[])
                : [];

        const updatedPasskeys = [
            ...existingPasskeys.filter(
                (p) =>
                    p.id !== passkeyId
            ),
            newPasskey,
        ];

        await account.updatePrefs({
            ...prefs,
            passkeys:
                updatedPasskeys,
        });

        return {
            success: true,
            passkey: newPasskey,
        };
    } catch (err: unknown) {
        if (
            err instanceof DOMException &&
            err.name ===
            "NotAllowedError"
        ) {
            return {
                success: false,
                error:
                    "Passkey setup was cancelled by the user.",
            };
        }

        const errorMsg =
            err instanceof Error
                ? err.message
                : String(err);

        return {
            success: false,
            error:
                `Failed to register passkey: ${errorMsg}`,
        };
    }
}

/**
 * Starts passkey authentication
 */
export async function loginWithPasskey(): Promise<{
    success: boolean;
    user?: unknown;
    error?: string;
}> {
    if (
        typeof window === "undefined" ||
        !window.PublicKeyCredential
    ) {
        return {
            success: false,
            error:
                "Passkey authentication is not supported by your browser.",
        };
    }

    try {
        const challenge =
            new Uint8Array(32);

        window.crypto.getRandomValues(
            challenge
        );

        const requestOptions: CredentialRequestOptions =
        {
            publicKey: {
                challenge,
                timeout: 60000,
                userVerification:
                    "preferred",
            },
        };

        const assertion =
            (await navigator.credentials.get(
                requestOptions
            )) as
            | PublicKeyCredential
            | null;

        if (!assertion) {
            return {
                success: false,
                error:
                    "Passkey verification was not completed.",
            };
        }

        const currentUser =
            await getCurrentUser();

        if (currentUser) {
            return {
                success: true,
                user: currentUser,
            };
        }

        return {
            success: false,
            error:
                "Device passkey verified successfully! Please sign in with Email/Password once to sync your Appwrite session.",
        };
    } catch (err: unknown) {
        if (
            err instanceof DOMException &&
            err.name ===
            "NotAllowedError"
        ) {
            return {
                success: false,
                error:
                    "Passkey verification prompt was cancelled.",
            };
        }

        const errorMsg =
            err instanceof Error
                ? err.message
                : String(err);

        return {
            success: false,
            error:
                `Passkey authentication failed: ${errorMsg}`,
        };
    }
}

export async function getUserPasskeys(): Promise<
    PasskeyEntry[]
> {
    try {
        const prefs =
            (await account.getPrefs()) as Record<
                string,
                unknown
            >;

        return Array.isArray(
            prefs.passkeys
        )
            ? (prefs.passkeys as PasskeyEntry[])
            : [];
    } catch {
        return [];
    }
}

export async function deletePasskey(
    passkeyId: string
): Promise<boolean> {
    try {
        const prefs =
            (await account.getPrefs()) as Record<
                string,
                unknown
            >;

        const existingPasskeys =
            Array.isArray(
                prefs.passkeys
            )
                ? (prefs.passkeys as PasskeyEntry[])
                : [];

        const updatedPasskeys =
            existingPasskeys.filter(
                (p) =>
                    p.id !== passkeyId
            );

        await account.updatePrefs({
            ...prefs,
            passkeys:
                updatedPasskeys,
        });

        return true;
    } catch {
        return false;
    }
}

/* =========================================================
   PASSWORD RECOVERY
========================================================= */

export async function createPasswordRecovery(
    email: string
) {
    const redirectUrl =
        window.location.origin +
        window.location.pathname;

    return await account.createRecovery(
        email,
        redirectUrl
    );
}

export async function completePasswordReset(
    userId: string,
    secret: string,
    password: string
) {
    return await account.updateRecovery(
        userId,
        secret,
        password
    );
}

/* =========================================================
   EMAIL OTP
========================================================= */

export async function sendEmailOTP(
    email: string
) {
    return await account.createEmailToken(
        ID.unique(),
        email
    );
}

export async function verifyEmailOTP(
    userId: string,
    secret: string
) {
    const currentUser =
        await getCurrentUser();

    if (
        currentUser &&
        currentUser.$id === userId
    ) {
        return {
            current: true,
        };
    }

    return await account.createSession(
        userId,
        secret
    );
}

/* =========================================================
   USER PROFILE DATABASE
========================================================= */

export interface UserProfileData {
    user_id: string;
    name: string;
    email: string;
    phone?: string;
    LifeStage?: string;
}

export async function createUserProfile(
    profile: UserProfileData
) {
    if (!profile.user_id) {
        throw new Error(
            "Missing required attribute user_id"
        );
    }

    const rowData = {
        user_id:
            profile.user_id,

        name: profile.name,

        email: profile.email,

        phone:
            profile.phone ?? "",

        LifeStage:
            profile.LifeStage ?? "",
    };

    const rowPermissions = [
        Permission.read(
            Role.user(profile.user_id)
        ),
        Permission.update(
            Role.user(profile.user_id)
        ),
        Permission.delete(
            Role.user(profile.user_id)
        ),
    ];

    try {
        return await databases.createDocument(
            DATABASE_ID,
            USER_PROFILES_TABLE_ID,
            ID.unique(),
            rowData,
            rowPermissions
        );
    } catch (error: any) {
        console.error(
            "[Appwrite Error] Database operation failed:",
            {
                tableId:
                    USER_PROFILES_TABLE_ID,
                operation:
                    "createDocument",
                userId:
                    profile.user_id,
                code:
                    error?.code,
                type:
                    error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return null;
    }
}

export async function getUserProfile(
    userId: string
) {
    if (!userId) return null;

    try {
        const result =
            await databases.listDocuments(
                DATABASE_ID,
                USER_PROFILES_TABLE_ID,
                [
                    Query.equal(
                        "user_id",
                        userId
                    ),
                ]
            );

        return (
            result.documents[0] ??
            null
        );
    } catch (error: any) {
        console.error(
            "[Appwrite Error] Database operation failed:",
            {
                tableId:
                    USER_PROFILES_TABLE_ID,
                operation:
                    "listDocuments",
                userId,
                code:
                    error?.code,
                type:
                    error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return null;
    }
}

export async function updateUserProfile(
    documentId: string,
    data: Partial<UserProfileData>
) {
    if (!documentId) return null;

    try {
        return await databases.updateDocument(
            DATABASE_ID,
            USER_PROFILES_TABLE_ID,
            documentId,
            data
        );
    } catch (error: any) {
        console.error(
            "[Appwrite Error] Database operation failed:",
            {
                tableId:
                    USER_PROFILES_TABLE_ID,
                operation:
                    "updateDocument",
                documentId,
                code:
                    error?.code,
                type:
                    error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return null;
    }
}

/* =========================================================
   JOURNALS DATABASE
========================================================= */

export async function getUserJournals(
    userId: string
): Promise<JournalEntry[]> {
    if (!userId) return [];

    try {
        const res =
            await databases.listDocuments(
                DATABASE_ID,
                JOURNALS_TABLE_ID,
                [
                    Query.equal(
                        "user_id",
                        userId
                    ),
                ]
            );

        return res.documents.map(
            (
                doc: Record<
                    string,
                    unknown
                >
            ) => ({
                id: (doc.$id ||
                    doc.id) as string,

                title:
                    (doc.title as string) ||
                    "Untitled Journal",

                content:
                    (doc.content as string) ||
                    "",

                date:
                    (doc.date as string) ||
                    new Date()
                        .toISOString()
                        .split("T")[0],

                category:
                    ((doc.category as string) ||
                        "puberty") as JournalEntry[
                    "category"
                    ],

                mood:
                    (doc.mood as string) ||
                    "Calm",

                isEncrypted:
                    typeof doc.is_encrypted ===
                        "boolean"
                        ? doc.is_encrypted
                        : true,
            })
        );
    } catch (error: any) {
        console.error(
            "[Appwrite Error] Database operation failed:",
            {
                tableId:
                    JOURNALS_TABLE_ID,
                operation:
                    "listDocuments",
                userId,
                code:
                    error?.code,
                type:
                    error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return [];
    }
}

export async function createJournal(
    entry: {
        userId: string;
        title: string;
        content: string;
        date: string;
        category: JournalEntry["category"];
        mood?: string;
        isEncrypted?: boolean;
    }
): Promise<JournalEntry | null> {
    if (!entry.userId) {
        console.error(
            "[Appwrite Error] createJournal failed: Missing authenticated user ID"
        );

        return null;
    }

    const activeUser =
        await getCurrentUser();

    if (
        !activeUser ||
        activeUser.$id !==
        entry.userId
    ) {
        console.error(
            "[Appwrite Error] Database operation failed: User is not authenticated or ID mismatch"
        );

        return null;
    }

    const rowData: Record<
        string,
        unknown
    > = {
        user_id:
            entry.userId,

        title:
            entry.title.trim(),

        content:
            entry.content.trim(),

        date:
            entry.date,

        category:
            entry.category,

        is_encrypted:
            entry.isEncrypted ??
            true,
    };

    if (
        entry.mood &&
        entry.mood.trim() !== ""
    ) {
        rowData.mood =
            entry.mood.trim();
    }

    const permissions = [
        Permission.read(
            Role.user(entry.userId)
        ),
        Permission.update(
            Role.user(entry.userId)
        ),
        Permission.delete(
            Role.user(entry.userId)
        ),
    ];

    try {
        const doc =
            (await databases.createDocument(
                DATABASE_ID,
                JOURNALS_TABLE_ID,
                ID.unique(),
                rowData,
                permissions
            )) as Record<
                string,
                unknown
            >;

        return {
            id: (doc.$id ||
                doc.id) as string,

            title:
                (doc.title as string) ||
                entry.title,

            content:
                (doc.content as string) ||
                entry.content,

            date:
                (doc.date as string) ||
                entry.date,

            category:
                ((doc.category as string) ||
                    entry.category) as JournalEntry[
                "category"
                ],

            mood:
                (doc.mood as string) ||
                entry.mood ||
                "Calm",

            isEncrypted:
                typeof doc.is_encrypted ===
                    "boolean"
                    ? doc.is_encrypted
                    : (entry.isEncrypted ??
                        true),
        };
    } catch (error: any) {
        console.error(
            "[Appwrite Error] Database operation failed:",
            {
                tableId:
                    JOURNALS_TABLE_ID,
                operation:
                    "createDocument",
                userId:
                    entry.userId,
                code:
                    error?.code,
                type:
                    error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return null;
    }
}

export async function deleteJournal(
    documentId: string
): Promise<boolean> {
    if (!documentId) return false;

    try {
        await databases.deleteDocument(
            DATABASE_ID,
            JOURNALS_TABLE_ID,
            documentId
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite Error] Database operation failed:",
            {
                tableId:
                    JOURNALS_TABLE_ID,
                operation:
                    "deleteDocument",
                documentId,
                code:
                    error?.code,
                type:
                    error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return false;
    }
}

/* =========================================================
   PERIOD LOGS DATABASE
========================================================= */

export interface PeriodLogResult {
    docId?: string;
    cycleDay: number;
    flow:
    | "light"
    | "medium"
    | "heavy";
    symptoms: string[];
    waterGlasses: number;
    date: string;
    notes?: string;
}

export async function getUserPeriodLogs(
    userId: string
): Promise<PeriodLogResult[]> {
    if (!userId) return [];

    try {
        const res =
            await databases.listDocuments(
                DATABASE_ID,
                PERIOD_LOGS_TABLE_ID,
                [
                    Query.equal(
                        "user_id",
                        userId
                    ),
                ]
            );

        return res.documents.map(
            (
                doc: Record<
                    string,
                    unknown
                >
            ) => {
                let parsedSymptoms: string[] =
                    [];

                if (
                    typeof doc.symptoms ===
                    "string" &&
                    doc.symptoms
                ) {
                    try {
                        parsedSymptoms =
                            JSON.parse(
                                doc.symptoms
                            );
                    } catch {
                        parsedSymptoms =
                            doc.symptoms
                                .split(",")
                                .map((s) =>
                                    s.trim()
                                )
                                .filter(
                                    Boolean
                                );
                    }
                } else if (
                    Array.isArray(
                        doc.symptoms
                    )
                ) {
                    parsedSymptoms =
                        doc.symptoms as string[];
                }

                const rawFlow =
                    (
                        (doc.flow_level as string) ||
                        "medium"
                    ).toLowerCase();

                const validFlow:
                    | "light"
                    | "medium"
                    | "heavy" =
                    rawFlow === "light" ||
                        rawFlow === "heavy"
                        ? rawFlow
                        : "medium";

                return {
                    docId: (doc.$id ||
                        doc.id) as string,

                    cycleDay:
                        Math.floor(
                            Number(
                                doc.cycle_day
                            ) || 14
                        ),

                    flow: validFlow,

                    symptoms:
                        Array.isArray(
                            parsedSymptoms
                        )
                            ? parsedSymptoms
                            : [],

                    waterGlasses:
                        Math.floor(
                            Number(
                                doc.water_intake
                            ) || 6
                        ),

                    date:
                        (doc.date as string) ||
                        new Date()
                            .toISOString()
                            .split("T")[0],

                    notes:
                        (doc.notes as string) ||
                        "",
                };
            }
        );
    } catch (error: any) {
        console.error(
            "[Appwrite Error] Database operation failed:",
            {
                tableId:
                    PERIOD_LOGS_TABLE_ID,
                operation:
                    "listDocuments",
                userId,
                code:
                    error?.code,
                type:
                    error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return [];
    }
}

export async function savePeriodLog(
    log: {
        userId: string;
        date: string;
        cycleDay: number;
        flow:
        | "light"
        | "medium"
        | "heavy";
        symptoms: string[];
        waterGlasses: number;
        notes?: string;
        docId?: string;
        isNewCycle?: boolean;
    }
): Promise<PeriodLogResult | null> {
    if (!log.userId) {
        console.error(
            "[Appwrite Error] savePeriodLog failed: Missing authenticated user ID"
        );

        return null;
    }

    const activeUser =
        await getCurrentUser();

    if (
        !activeUser ||
        activeUser.$id !==
        log.userId
    ) {
        return null;
    }

    const saveDate =
        log.date ||
        new Date()
            .toISOString()
            .split("T")[0];

    const rowData: Record<
        string,
        unknown
    > = {
        user_id:
            log.userId,

        date:
            saveDate,

        cycle_day:
            Math.floor(
                Number(
                    log.cycleDay
                ) || 1
            ),

        flow_level:
            log.flow ||
            "medium",

        symptoms:
            JSON.stringify(
                log.symptoms || []
            ),

        water_intake:
            Math.floor(
                Number(
                    log.waterGlasses
                ) || 0
            ),
    };

    if (
        log.notes !==
        undefined &&
        log.notes !== null &&
        log.notes.trim() !== ""
    ) {
        rowData.notes =
            log.notes.trim();
    }

    const permissions = [
        Permission.read(
            Role.user(log.userId)
        ),
        Permission.update(
            Role.user(log.userId)
        ),
        Permission.delete(
            Role.user(log.userId)
        ),
    ];

    try {
        let doc: Record<
            string,
            unknown
        >;

        if (
            log.isNewCycle ===
            true
        ) {
            doc =
                (await databases.createDocument(
                    DATABASE_ID,
                    PERIOD_LOGS_TABLE_ID,
                    ID.unique(),
                    rowData,
                    permissions
                )) as Record<
                    string,
                    unknown
                >;
        } else if (
            log.docId
        ) {
            doc =
                (await databases.updateDocument(
                    DATABASE_ID,
                    PERIOD_LOGS_TABLE_ID,
                    log.docId,
                    rowData
                )) as Record<
                    string,
                    unknown
                >;
        } else {
            const existingLogs =
                await getUserPeriodLogs(
                    log.userId
                );

            const existingSameDate =
                existingLogs.find(
                    (item) =>
                        item.date ===
                        saveDate
                );

            if (
                existingSameDate?.docId
            ) {
                doc =
                    (await databases.updateDocument(
                        DATABASE_ID,
                        PERIOD_LOGS_TABLE_ID,
                        existingSameDate.docId,
                        rowData
                    )) as Record<
                        string,
                        unknown
                    >;
            } else {
                doc =
                    (await databases.createDocument(
                        DATABASE_ID,
                        PERIOD_LOGS_TABLE_ID,
                        ID.unique(),
                        rowData,
                        permissions
                    )) as Record<
                        string,
                        unknown
                    >;
            }
        }

        const rawFlow =
            (
                (doc.flow_level as string) ||
                log.flow
            ).toLowerCase();

        const validFlow:
            | "light"
            | "medium"
            | "heavy" =
            rawFlow === "light" ||
                rawFlow === "heavy"
                ? rawFlow
                : "medium";

        let savedSymptoms =
            log.symptoms || [];

        if (
            typeof doc.symptoms ===
            "string"
        ) {
            try {
                const parsed =
                    JSON.parse(
                        doc.symptoms
                    );

                if (
                    Array.isArray(
                        parsed
                    )
                ) {
                    savedSymptoms =
                        parsed;
                }
            } catch {
                // Keep fallback
            }
        }

        return {
            docId: (doc.$id ||
                doc.id ||
                log.docId) as string,

            cycleDay:
                Number(
                    doc.cycle_day
                ) || log.cycleDay,

            flow: validFlow,

            symptoms:
                savedSymptoms,

            waterGlasses:
                Number(
                    doc.water_intake
                ) ||
                log.waterGlasses,

            date:
                (doc.date as string) ||
                saveDate,

            notes:
                (doc.notes as string) ||
                log.notes ||
                "",
        };
    } catch (error: any) {
        console.error(
            "[Appwrite Error] Period log database operation failed:",
            error
        );

        return null;
    }
}

/* =========================================================
   HUSBAND TASKS DATABASE
========================================================= */

export async function getUserHusbandTasks(
    userId: string
): Promise<HusbandTask[]> {
    if (!userId) {
        return [];
    }

    try {
        const res =
            await databases.listDocuments(
                DATABASE_ID,
                HUSBAND_TASKS_TABLE_ID,
                [
                    Query.equal(
                        "user_id",
                        userId
                    ),
                ]
            );

        return res.documents.map(
            (
                doc: Record<
                    string,
                    unknown
                >
            ) => ({
                id: (doc.$id ||
                    doc.id) as string,

                title:
                    (doc.title as string) ||
                    "",

                category:
                    ((doc.category as string) ||
                        "essentials") as HusbandTask[
                    "category"
                    ],

                dueDate:
                    (doc.due_date as string) ||
                    "Today",

                isCompleted:
                    Boolean(
                        doc.is_completed
                    ),

                priority:
                    ((doc.priority as string) ||
                        "medium") as HusbandTask[
                    "priority"
                    ],
            })
        );
    } catch (error: any) {
        console.error(
            "[Appwrite Error] getUserHusbandTasks:",
            error
        );

        return [];
    }
}

export async function createHusbandTask(
    task: {
        userId: string;
        title: string;
        category: HusbandTask["category"];
        dueDate?: string;
        isCompleted?: boolean;
        priority?: HusbandTask["priority"];
    }
): Promise<HusbandTask | null> {
    if (
        !task.userId ||
        !task.title.trim()
    ) {
        return null;
    }

    const activeUser =
        await getCurrentUser();

    if (
        !activeUser ||
        activeUser.$id !==
        task.userId
    ) {
        return null;
    }

    const rowData = {
        user_id:
            task.userId,

        title:
            task.title.trim(),

        category:
            task.category ||
            "essentials",

        due_date:
            task.dueDate ||
            "Today",

        is_completed:
            task.isCompleted ??
            false,

        priority:
            task.priority ||
            "medium",
    };

    const permissions = [
        Permission.read(
            Role.user(task.userId)
        ),
        Permission.update(
            Role.user(task.userId)
        ),
        Permission.delete(
            Role.user(task.userId)
        ),
    ];

    try {
        const doc =
            await databases.createDocument(
                DATABASE_ID,
                HUSBAND_TASKS_TABLE_ID,
                ID.unique(),
                rowData,
                permissions
            );

        return {
            id: doc.$id,

            title:
                (doc.title as string) ||
                task.title,

            category:
                ((doc.category as string) ||
                    task.category) as HusbandTask[
                "category"
                ],

            dueDate:
                (doc.due_date as string) ||
                task.dueDate ||
                "Today",

            isCompleted:
                Boolean(
                    doc.is_completed
                ),

            priority:
                ((doc.priority as string) ||
                    task.priority ||
                    "medium") as HusbandTask[
                "priority"
                ],
        };
    } catch (error: any) {
        console.error(
            "[Appwrite Error] createHusbandTask:",
            error
        );

        return null;
    }
}

export async function updateHusbandTaskStatus(
    documentId: string,
    isCompleted: boolean
): Promise<boolean> {
    if (!documentId) {
        return false;
    }

    try {
        await databases.updateDocument(
            DATABASE_ID,
            HUSBAND_TASKS_TABLE_ID,
            documentId,
            {
                is_completed:
                    isCompleted,
            }
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite Error] updateHusbandTaskStatus:",
            error
        );

        return false;
    }
}

export async function deleteHusbandTask(
    documentId: string
): Promise<boolean> {
    if (!documentId) {
        return false;
    }

    try {
        await databases.deleteDocument(
            DATABASE_ID,
            HUSBAND_TASKS_TABLE_ID,
            documentId
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite Error] deleteHusbandTask:",
            error
        );

        return false;
    }
}

/* =========================================================
   APPOINTMENTS DATABASE
========================================================= */

export interface AppointmentData {
    id?: string;
    userId: string;
    doctorName: string;
    hospitalName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentType: string;
    status: string;
    notes?: string;
}

export async function getUserAppointments(
    userId: string
): Promise<AppointmentData[]> {
    if (!userId) {
        return [];
    }

    try {
        console.log(
            "[APPOINTMENTS] Loading appointments:",
            userId
        );

        const res =
            await databases.listDocuments(
                DATABASE_ID,
                APPOINTMENTS_TABLE_ID,
                [
                    Query.equal(
                        "user_id",
                        userId
                    ),
                ]
            );

        return res.documents.map(
            (
                doc: Record<
                    string,
                    unknown
                >
            ) => ({
                id: (doc.$id ||
                    doc.id) as string,

                userId:
                    (doc.user_id as string) ||
                    userId,

                doctorName:
                    (doc.doctor_name as string) ||
                    "",

                hospitalName:
                    (doc.hospital_name as string) ||
                    "",

                appointmentDate:
                    (doc.appointment_date as string) ||
                    "",

                appointmentTime:
                    (doc.appointment_time as string) ||
                    "",

                appointmentType:
                    (doc.appointment_type as string) ||
                    "",

                status:
                    (doc.status as string) ||
                    "",

                notes:
                    (doc.notes as string) ||
                    "",
            })
        );
    } catch (error: any) {
        console.error(
            "[Appwrite Error] getUserAppointments:",
            {
                tableId:
                    APPOINTMENTS_TABLE_ID,
                operation:
                    "listDocuments",
                userId,
                code:
                    error?.code,
                type:
                    error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return [];
    }
}

export async function createAppointment(
    appointment: AppointmentData
): Promise<AppointmentData | null> {
    if (!appointment.userId) {
        console.error(
            "[Appwrite Error] createAppointment: Missing user ID"
        );

        return null;
    }

    const activeUser =
        await getCurrentUser();

    if (
        !activeUser ||
        activeUser.$id !==
        appointment.userId
    ) {
        console.error(
            "[Appwrite Error] createAppointment: User is not authenticated or ID mismatch"
        );

        return null;
    }

    if (
        !appointment.doctorName.trim() ||
        !appointment.hospitalName.trim() ||
        !appointment.appointmentDate ||
        !appointment.appointmentTime ||
        !appointment.appointmentType.trim() ||
        !appointment.status.trim()
    ) {
        console.error(
            "[Appwrite Error] createAppointment: Missing required appointment data"
        );

        return null;
    }

    const rowData: Record<
        string,
        unknown
    > = {
        user_id:
            appointment.userId,

        doctor_name:
            appointment.doctorName.trim(),

        hospital_name:
            appointment.hospitalName.trim(),

        appointment_date:
            appointment.appointmentDate,

        appointment_time:
            appointment.appointmentTime,

        appointment_type:
            appointment.appointmentType.trim(),

        status:
            appointment.status.trim(),
    };

    if (
        appointment.notes &&
        appointment.notes.trim() !== ""
    ) {
        rowData.notes =
            appointment.notes.trim();
    }

    const permissions = [
        Permission.read(
            Role.user(
                appointment.userId
            )
        ),

        Permission.update(
            Role.user(
                appointment.userId
            )
        ),

        Permission.delete(
            Role.user(
                appointment.userId
            )
        ),
    ];

    try {
        console.log(
            "[APPOINTMENTS] Creating appointment:",
            rowData
        );

        const doc =
            (await databases.createDocument(
                DATABASE_ID,
                APPOINTMENTS_TABLE_ID,
                ID.unique(),
                rowData,
                permissions
            )) as Record<
                string,
                unknown
            >;

        console.log(
            "[APPOINTMENTS] Appointment created:",
            doc.$id
        );

        return {
            id: String(doc.$id),

            userId:
                (doc.user_id as string) ||
                appointment.userId,

            doctorName:
                (doc.doctor_name as string) ||
                appointment.doctorName,

            hospitalName:
                (doc.hospital_name as string) ||
                appointment.hospitalName,

            appointmentDate:
                (doc.appointment_date as string) ||
                appointment.appointmentDate,

            appointmentTime:
                (doc.appointment_time as string) ||
                appointment.appointmentTime,

            appointmentType:
                (doc.appointment_type as string) ||
                appointment.appointmentType,

            status:
                (doc.status as string) ||
                appointment.status,

            notes:
                (doc.notes as string) ||
                appointment.notes ||
                "",
        };
    } catch (error: any) {
        console.error(
            "[Appwrite Error] createAppointment:",
            {
                tableId:
                    APPOINTMENTS_TABLE_ID,
                operation:
                    "createDocument",
                userId:
                    appointment.userId,
                code:
                    error?.code,
                type:
                    error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return null;
    }
}

export async function updateAppointment(
    documentId: string,
    data: Partial<
        Omit<AppointmentData, "id" | "userId">
    >
): Promise<AppointmentData | null> {
    if (!documentId) {
        return null;
    }

    const rowData: Record<
        string,
        unknown
    > = {};

    if (
        data.doctorName !==
        undefined
    ) {
        rowData.doctor_name =
            data.doctorName.trim();
    }

    if (
        data.hospitalName !==
        undefined
    ) {
        rowData.hospital_name =
            data.hospitalName.trim();
    }

    if (
        data.appointmentDate !==
        undefined
    ) {
        rowData.appointment_date =
            data.appointmentDate;
    }

    if (
        data.appointmentTime !==
        undefined
    ) {
        rowData.appointment_time =
            data.appointmentTime;
    }

    if (
        data.appointmentType !==
        undefined
    ) {
        rowData.appointment_type =
            data.appointmentType.trim();
    }

    if (
        data.status !==
        undefined
    ) {
        rowData.status =
            data.status.trim();
    }

    if (
        data.notes !==
        undefined
    ) {
        rowData.notes =
            data.notes?.trim() || "";
    }

    try {
        const doc =
            (await databases.updateDocument(
                DATABASE_ID,
                APPOINTMENTS_TABLE_ID,
                documentId,
                rowData
            )) as Record<
                string,
                unknown
            >;

        return {
            id: String(doc.$id),

            userId:
                (doc.user_id as string) ||
                "",

            doctorName:
                (doc.doctor_name as string) ||
                "",

            hospitalName:
                (doc.hospital_name as string) ||
                "",

            appointmentDate:
                (doc.appointment_date as string) ||
                "",

            appointmentTime:
                (doc.appointment_time as string) ||
                "",

            appointmentType:
                (doc.appointment_type as string) ||
                "",

            status:
                (doc.status as string) ||
                "",

            notes:
                (doc.notes as string) ||
                "",
        };
    } catch (error: any) {
        console.error(
            "[Appwrite Error] updateAppointment:",
            {
                tableId:
                    APPOINTMENTS_TABLE_ID,
                operation:
                    "updateDocument",
                documentId,
                code:
                    error?.code,
                type:
                    error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return null;
    }
}

export async function deleteAppointment(
    documentId: string
): Promise<boolean> {
    if (!documentId) {
        return false;
    }

    try {
        await databases.deleteDocument(
            DATABASE_ID,
            APPOINTMENTS_TABLE_ID,
            documentId
        );

        console.log(
            "[APPOINTMENTS] Appointment deleted:",
            documentId
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite Error] deleteAppointment:",
            {
                tableId:
                    APPOINTMENTS_TABLE_ID,
                operation:
                    "deleteDocument",
                documentId,
                code:
                    error?.code,
                type:
                    error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return false;
    }
}

/* =========================================================
   MEDICAL RECORDS DATABASE
========================================================= */

export interface MedicalRecordData {
    id?: string;
    userId: string;
    title: string;
    recordType: string;
    doctorName?: string;
    hospitalName?: string;
    recordDate: string;
    fileId?: string;
    notes?: string;
}

export async function getUserMedicalRecords(
    userId: string
): Promise<MedicalRecordData[]> {
    if (!userId) {
        return [];
    }

    try {
        const res = await databases.listDocuments(
            DATABASE_ID,
            MEDICAL_RECORDS_TABLE_ID,
            [
                Query.equal(
                    "user_id",
                    userId
                ),
            ]
        );

        return res.documents.map(
            (doc: Record<string, unknown>) => ({
                id: String(
                    doc.$id || doc.id
                ),

                userId:
                    (doc.user_id as string) ||
                    userId,

                title:
                    (doc.title as string) ||
                    "Medical Record",

                recordType:
                    (doc.record_type as string) ||
                    "Medical Report",

                doctorName:
                    (doc.doctor_name as string) ||
                    "",

                hospitalName:
                    (doc.hospital_name as string) ||
                    "",

                recordDate:
                    (doc.record_date as string) ||
                    "",

                fileId:
                    (doc.file_id as string) ||
                    "",

                notes:
                    (doc.notes as string) ||
                    "",
            })
        );
    } catch (error: any) {
        console.error(
            "[Appwrite Error] getUserMedicalRecords:",
            {
                tableId:
                    MEDICAL_RECORDS_TABLE_ID,
                operation:
                    "listDocuments",
                userId,
                code: error?.code,
                type: error?.type,
                message:
                    error?.message || error,
            }
        );

        return [];
    }
}

export async function createMedicalRecord(
    record: MedicalRecordData
): Promise<MedicalRecordData | null> {
    if (
        !record.userId ||
        !record.title.trim() ||
        !record.recordType.trim() ||
        !record.recordDate
    ) {
        console.error(
            "[Appwrite Error] createMedicalRecord: Missing required data"
        );

        return null;
    }

    const activeUser =
        await getCurrentUser();

    if (
        !activeUser ||
        activeUser.$id !==
        record.userId
    ) {
        console.error(
            "[Appwrite Error] createMedicalRecord: User is not authenticated or ID mismatch"
        );

        return null;
    }

    const rowData: Record<string, unknown> = {
        user_id:
            record.userId,

        title:
            record.title.trim(),

        record_type:
            record.recordType.trim(),

        record_date:
            record.recordDate,
    };

    if (
        record.doctorName &&
        record.doctorName.trim()
    ) {
        rowData.doctor_name =
            record.doctorName.trim();
    }

    if (
        record.hospitalName &&
        record.hospitalName.trim()
    ) {
        rowData.hospital_name =
            record.hospitalName.trim();
    }

    if (
        record.fileId &&
        record.fileId.trim()
    ) {
        rowData.file_id =
            record.fileId.trim();
    }

    if (
        record.notes &&
        record.notes.trim()
    ) {
        rowData.notes =
            record.notes.trim();
    }

    const permissions = [
        Permission.read(
            Role.user(record.userId)
        ),

        Permission.update(
            Role.user(record.userId)
        ),

        Permission.delete(
            Role.user(record.userId)
        ),
    ];

    try {
        const doc =
            (await databases.createDocument(
                DATABASE_ID,
                MEDICAL_RECORDS_TABLE_ID,
                ID.unique(),
                rowData,
                permissions
            )) as Record<string, unknown>;

        return {
            id: String(
                doc.$id || doc.id
            ),

            userId:
                (doc.user_id as string) ||
                record.userId,

            title:
                (doc.title as string) ||
                record.title,

            recordType:
                (doc.record_type as string) ||
                record.recordType,

            doctorName:
                (doc.doctor_name as string) ||
                record.doctorName ||
                "",

            hospitalName:
                (doc.hospital_name as string) ||
                record.hospitalName ||
                "",

            recordDate:
                (doc.record_date as string) ||
                record.recordDate,

            fileId:
                (doc.file_id as string) ||
                record.fileId ||
                "",

            notes:
                (doc.notes as string) ||
                record.notes ||
                "",
        };
    } catch (error: any) {
        console.error(
            "[Appwrite Error] createMedicalRecord:",
            {
                tableId:
                    MEDICAL_RECORDS_TABLE_ID,
                operation:
                    "createDocument",
                userId:
                    record.userId,
                code: error?.code,
                type: error?.type,
                message:
                    error?.message || error,
            }
        );

        return null;
    }
}

export async function updateMedicalRecord(
    documentId: string,
    data: Partial<
        Omit<
            MedicalRecordData,
            "id" | "userId"
        >
    >
): Promise<MedicalRecordData | null> {
    if (!documentId) {
        return null;
    }

    const rowData: Record<string, unknown> = {};

    if (
        data.title !== undefined
    ) {
        rowData.title =
            data.title.trim();
    }

    if (
        data.recordType !== undefined
    ) {
        rowData.record_type =
            data.recordType.trim();
    }

    if (
        data.doctorName !== undefined
    ) {
        rowData.doctor_name =
            data.doctorName.trim();
    }

    if (
        data.hospitalName !== undefined
    ) {
        rowData.hospital_name =
            data.hospitalName.trim();
    }

    if (
        data.recordDate !== undefined
    ) {
        rowData.record_date =
            data.recordDate;
    }

    if (
        data.fileId !== undefined
    ) {
        rowData.file_id =
            data.fileId?.trim() || "";
    }

    if (
        data.notes !== undefined
    ) {
        rowData.notes =
            data.notes?.trim() || "";
    }

    try {
        const doc =
            (await databases.updateDocument(
                DATABASE_ID,
                MEDICAL_RECORDS_TABLE_ID,
                documentId,
                rowData
            )) as Record<string, unknown>;

        return {
            id: String(
                doc.$id || doc.id
            ),

            userId:
                (doc.user_id as string) ||
                "",

            title:
                (doc.title as string) ||
                "",

            recordType:
                (doc.record_type as string) ||
                "",

            doctorName:
                (doc.doctor_name as string) ||
                "",

            hospitalName:
                (doc.hospital_name as string) ||
                "",

            recordDate:
                (doc.record_date as string) ||
                "",

            fileId:
                (doc.file_id as string) ||
                "",

            notes:
                (doc.notes as string) ||
                "",
        };
    } catch (error: any) {
        console.error(
            "[Appwrite Error] updateMedicalRecord:",
            error
        );

        return null;
    }
}

export async function deleteMedicalRecord(
    documentId: string
): Promise<boolean> {
    if (!documentId) {
        return false;
    }

    try {
        await databases.deleteDocument(
            DATABASE_ID,
            MEDICAL_RECORDS_TABLE_ID,
            documentId
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite Error] deleteMedicalRecord:",
            error
        );

        return false;
    }
}

/* =========================================================
   CHAT MESSAGES
========================================================= */

/*
   IMPORTANT:

   Your Appwrite chat_messages table contains:

   user_id       required string
   sender_id     required string
   receiver_id   required string
   message       required string
   message_type  required string
   is_read       required boolean
   sent_at       required string

   There is NO "sender" column in the Appwrite table.

   Therefore this code DOES NOT send a "sender" field
   to Appwrite.

   Instead:
   - sender_id = authenticated user ID for husband
   - sender_id = "bot" for bot
*/

export interface ChatMessageData {
    id?: string;
    userId: string;
    sender: "husband" | "bot";
    senderId?: string;
    receiverId?: string;
    message: string;
    messageType?: string;
    isRead?: boolean;
    sentAt?: string;
}

/* =========================================================
   GET CHAT MESSAGES
========================================================= */

export const getUserChatMessages = async (
    userId: string
): Promise<ChatMessageData[]> => {
    if (!userId) {
        return [];
    }

    try {
        console.log(
            "[CHAT] Loading chat messages:",
            userId
        );

        const response =
            await databases.listDocuments(
                DATABASE_ID,
                CHAT_MESSAGES_TABLE_ID,
                [
                    Query.equal(
                        "user_id",
                        userId
                    ),
                    Query.orderAsc(
                        "$createdAt"
                    ),
                ]
            );

        return response.documents.map(
            (doc: any) => {
                const senderId =
                    String(
                        doc.sender_id || ""
                    );

                return {
                    id: doc.$id,

                    userId: String(
                        doc.user_id ||
                        userId
                    ),

                    sender:
                        senderId === "bot"
                            ? "bot"
                            : "husband",

                    senderId,

                    receiverId:
                        String(
                            doc.receiver_id ||
                            ""
                        ),

                    message:
                        String(
                            doc.message ||
                            ""
                        ),

                    messageType:
                        String(
                            doc.message_type ||
                            "text"
                        ),

                    isRead:
                        Boolean(
                            doc.is_read
                        ),

                    sentAt:
                        String(
                            doc.sent_at ||
                            doc.$createdAt ||
                            ""
                        ),
                };
            }
        );
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to load chat messages:",
            {
                tableId:
                    CHAT_MESSAGES_TABLE_ID,

                operation:
                    "listDocuments",

                userId,

                code:
                    error?.code,

                type:
                    error?.type,

                message:
                    error?.message ||
                    error,
            }
        );

        return [];
    }
};

/* =========================================================
   CREATE CHAT MESSAGE
========================================================= */

export const createChatMessage = async (
    message: ChatMessageData
): Promise<ChatMessageData | null> => {
    if (
        !message.userId ||
        !message.message.trim()
    ) {
        console.error(
            "[Appwrite] createChatMessage: Missing required data"
        );

        return null;
    }

    const activeUser =
        await getCurrentUser();

    if (
        !activeUser ||
        activeUser.$id !==
        message.userId
    ) {
        console.error(
            "[Appwrite] createChatMessage: User is not authenticated or ID mismatch"
        );

        return null;
    }

    /*
       Husband message:
       sender_id   = authenticated user ID
       receiver_id = bot

       Bot message:
       sender_id   = bot
       receiver_id = authenticated user ID
    */

    const senderId =
        message.sender === "bot"
            ? "bot"
            : message.userId;

    const receiverId =
        message.sender === "bot"
            ? message.userId
            : "bot";

    const sentAt =
        message.sentAt ||
        new Date().toISOString();

    /*
       EXACTLY matches your Appwrite table.

       DO NOT add:
       sender

       because your table does not have
       a sender column.
    */

    const rowData = {
        user_id:
            message.userId,

        sender_id:
            senderId,

        receiver_id:
            receiverId,

        message:
            message.message.trim(),

        message_type:
            message.messageType ||
            "text",

        is_read:
            message.isRead ??
            false,

        sent_at:
            sentAt,
    };

    const permissions = [
        Permission.read(
            Role.user(message.userId)
        ),

        Permission.update(
            Role.user(message.userId)
        ),

        Permission.delete(
            Role.user(message.userId)
        ),
    ];

    try {
        console.log(
            "[CHAT] Creating chat message:",
            rowData
        );

        const document =
            await databases.createDocument(
                DATABASE_ID,
                CHAT_MESSAGES_TABLE_ID,
                ID.unique(),
                rowData,
                permissions
            );

        console.log(
            "[CHAT] Chat message created:",
            document.$id
        );

        const documentSenderId =
            String(
                document.sender_id ||
                senderId
            );

        return {
            id:
                document.$id,

            userId:
                String(
                    document.user_id ||
                    message.userId
                ),

            sender:
                documentSenderId ===
                    "bot"
                    ? "bot"
                    : "husband",

            senderId:
                documentSenderId,

            receiverId:
                String(
                    document.receiver_id ||
                    receiverId
                ),

            message:
                String(
                    document.message ||
                    message.message
                ),

            messageType:
                String(
                    document.message_type ||
                    message.messageType ||
                    "text"
                ),

            isRead:
                Boolean(
                    document.is_read
                ),

            sentAt:
                String(
                    document.sent_at ||
                    sentAt
                ),
        };
    } catch (error: any) {
        console.error(
            "[CHAT ERROR CODE]",
            error?.code
        );

        console.error(
            "[CHAT ERROR TYPE]",
            error?.type
        );

        console.error(
            "[CHAT ERROR MESSAGE]",
            error?.message
        );

        console.error(
            "[CHAT ERROR RAW]",
            error
        );

        console.error(
            "[CHAT ERROR PAYLOAD]",
            rowData
        );

        return null;
    }
};

/* =========================================================
   DELETE CHAT MESSAGE
========================================================= */

export const deleteChatMessage = async (
    documentId: string
): Promise<boolean> => {
    if (!documentId) {
        return false;
    }

    try {
        await databases.deleteDocument(
            DATABASE_ID,
            CHAT_MESSAGES_TABLE_ID,
            documentId
        );

        console.log(
            "[CHAT] Chat message deleted:",
            documentId
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to delete chat message:",
            {
                tableId:
                    CHAT_MESSAGES_TABLE_ID,

                operation:
                    "deleteDocument",

                documentId,

                code:
                    error?.code,

                type:
                    error?.type,

                message:
                    error?.message ||
                    error,
            }
        );

        return false;
    }
};
/* =========================================================
   NOTIFICATIONS DATABASE
========================================================= */

export interface NotificationData {
    id?: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    isRead?: boolean;
    scheduledAt?: string;
}

/* =========================================================
   GET USER NOTIFICATIONS
========================================================= */

export const getUserNotifications = async (
    userId: string
): Promise<NotificationData[]> => {
    if (!userId) {
        return [];
    }

    try {
        const response =
            await databases.listDocuments(
                DATABASE_ID,
                NOTIFICATIONS_TABLE_ID,
                [
                    Query.equal(
                        "user_id",
                        userId
                    ),
                ]
            );

        return response.documents.map(
            (doc: any) => ({
                id: doc.$id,
                userId: String(
                    doc.user_id || userId
                ),
                title: String(
                    doc.title || ""
                ),
                message: String(
                    doc.message || ""
                ),
                type: String(
                    doc.type || ""
                ),
                isRead: Boolean(
                    doc.is_read
                ),
                scheduledAt: doc.scheduled_at
                    ? String(doc.scheduled_at)
                    : undefined,
            })
        );
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to load notifications:",
            {
                tableId:
                    NOTIFICATIONS_TABLE_ID,
                operation:
                    "listDocuments",
                userId,
                code: error?.code,
                type: error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return [];
    }
};

/* =========================================================
   CREATE NOTIFICATION
========================================================= */

export const createNotification = async (
    notification: NotificationData
): Promise<NotificationData | null> => {
    if (
        !notification.userId ||
        !notification.title.trim() ||
        !notification.message.trim() ||
        !notification.type.trim()
    ) {
        console.error(
            "[Appwrite] createNotification: Missing required data"
        );
        return null;
    }

    const activeUser =
        await getCurrentUser();

    if (
        !activeUser ||
        activeUser.$id !==
        notification.userId
    ) {
        console.error(
            "[Appwrite] createNotification: User is not authenticated or ID mismatch"
        );
        return null;
    }

    const rowData = {
        user_id:
            notification.userId,
        title:
            notification.title.trim(),
        message:
            notification.message.trim(),
        type:
            notification.type.trim(),
        is_read:
            notification.isRead ?? false,
        ...(notification.scheduledAt
            ? {
                scheduled_at:
                    notification.scheduledAt,
            }
            : {}),
    };

    const permissions = [
        Permission.read(
            Role.user(notification.userId)
        ),
        Permission.update(
            Role.user(notification.userId)
        ),
        Permission.delete(
            Role.user(notification.userId)
        ),
    ];

    try {
        const document =
            await databases.createDocument(
                DATABASE_ID,
                NOTIFICATIONS_TABLE_ID,
                ID.unique(),
                rowData,
                permissions
            );

        return {
            id: document.$id,
            userId: String(
                document.user_id ||
                notification.userId
            ),
            title: String(
                document.title ||
                notification.title
            ),
            message: String(
                document.message ||
                notification.message
            ),
            type: String(
                document.type ||
                notification.type
            ),
            isRead: Boolean(
                document.is_read
            ),
            scheduledAt:
                document.scheduled_at
                    ? String(
                        document.scheduled_at
                    )
                    : notification.scheduledAt,
        };
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to create notification:",
            {
                tableId:
                    NOTIFICATIONS_TABLE_ID,
                operation:
                    "createDocument",
                userId:
                    notification.userId,
                code: error?.code,
                type: error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return null;
    }
};

/* =========================================================
   MARK NOTIFICATION AS READ / UNREAD
========================================================= */

export const updateNotificationReadStatus = async (
    documentId: string,
    isRead: boolean
): Promise<boolean> => {
    if (!documentId) {
        return false;
    }

    try {
        await databases.updateDocument(
            DATABASE_ID,
            NOTIFICATIONS_TABLE_ID,
            documentId,
            {
                is_read: isRead,
            }
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to update notification read status:",
            {
                tableId:
                    NOTIFICATIONS_TABLE_ID,
                operation:
                    "updateDocument",
                documentId,
                code: error?.code,
                type: error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return false;
    }
};

/* =========================================================
   DELETE NOTIFICATION
========================================================= */

export const deleteNotification = async (
    documentId: string
): Promise<boolean> => {
    if (!documentId) {
        return false;
    }

    try {
        await databases.deleteDocument(
            DATABASE_ID,
            NOTIFICATIONS_TABLE_ID,
            documentId
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to delete notification:",
            {
                tableId:
                    NOTIFICATIONS_TABLE_ID,
                operation:
                    "deleteDocument",
                documentId,
                code: error?.code,
                type: error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return false;
    }
};

/* =========================================================
   MEDICATIONS DATABASE
========================================================= */

export interface MedicationData {
    id?: string;
    userId: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    startDate: string;
    endDate?: string;
    instructions?: string;
    isActive: boolean;
}

/* =========================================================
   GET USER MEDICATIONS
========================================================= */

export const getUserMedications = async (
    userId: string
): Promise<MedicationData[]> => {
    if (!userId) {
        return [];
    }

    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            MEDICATIONS_TABLE_ID,
            [Query.equal("user_id", userId)]
        );

        return response.documents.map((doc: any) => ({
            id: doc.$id,
            userId: String(doc.user_id || userId),
            medicineName: String(doc.medicine_name || ""),
            dosage: String(doc.dosage || ""),
            frequency: String(doc.frequency || ""),
            startDate: String(doc.start_date || ""),
            endDate: doc.end_date ? String(doc.end_date) : undefined,
            instructions: doc.instructions
                ? String(doc.instructions)
                : undefined,
            isActive: Boolean(doc.is_active),
        }));
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to load medications:",
            {
                tableId: MEDICATIONS_TABLE_ID,
                operation: "listDocuments",
                userId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return [];
    }
};

/* =========================================================
   CREATE MEDICATION
========================================================= */

export const createMedication = async (
    medication: MedicationData
): Promise<MedicationData | null> => {
    if (
        !medication.userId ||
        !medication.medicineName.trim() ||
        !medication.dosage.trim() ||
        !medication.frequency.trim() ||
        !medication.startDate.trim()
    ) {
        console.error(
            "[Appwrite] createMedication: Missing required data"
        );
        return null;
    }

    const activeUser = await getCurrentUser();

    if (!activeUser || activeUser.$id !== medication.userId) {
        console.error(
            "[Appwrite] createMedication: User is not authenticated or ID mismatch"
        );
        return null;
    }

    const rowData = {
        user_id: medication.userId,
        medicine_name: medication.medicineName.trim(),
        dosage: medication.dosage.trim(),
        frequency: medication.frequency.trim(),
        start_date: medication.startDate.trim(),
        ...(medication.endDate
            ? { end_date: medication.endDate.trim() }
            : {}),
        ...(medication.instructions
            ? { instructions: medication.instructions.trim() }
            : {}),
        is_active: medication.isActive,
    };

    const permissions = [
        Permission.read(Role.user(medication.userId)),
        Permission.update(Role.user(medication.userId)),
        Permission.delete(Role.user(medication.userId)),
    ];

    try {
        const document = await databases.createDocument(
            DATABASE_ID,
            MEDICATIONS_TABLE_ID,
            ID.unique(),
            rowData,
            permissions
        );

        return {
            id: document.$id,
            userId: String(document.user_id || medication.userId),
            medicineName: String(
                document.medicine_name || medication.medicineName
            ),
            dosage: String(document.dosage || medication.dosage),
            frequency: String(
                document.frequency || medication.frequency
            ),
            startDate: String(
                document.start_date || medication.startDate
            ),
            endDate: document.end_date
                ? String(document.end_date)
                : medication.endDate,
            instructions: document.instructions
                ? String(document.instructions)
                : medication.instructions,
            isActive: Boolean(document.is_active),
        };
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to create medication:",
            {
                tableId: MEDICATIONS_TABLE_ID,
                operation: "createDocument",
                userId: medication.userId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return null;
    }
};

/* =========================================================
   UPDATE MEDICATION STATUS
========================================================= */

export const updateMedicationStatus = async (
    documentId: string,
    isActive: boolean
): Promise<boolean> => {
    if (!documentId) {
        return false;
    }

    try {
        await databases.updateDocument(
            DATABASE_ID,
            MEDICATIONS_TABLE_ID,
            documentId,
            {
                is_active: isActive,
            }
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to update medication status:",
            {
                tableId: MEDICATIONS_TABLE_ID,
                operation: "updateDocument",
                documentId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return false;
    }
};

/* =========================================================
   UPDATE MEDICATION
========================================================= */

export const updateMedication = async (
    documentId: string,
    medication: Partial<Omit<MedicationData, "id" | "userId">>
): Promise<MedicationData | null> => {
    if (!documentId) {
        return null;
    }

    const rowData: Record<string, unknown> = {};

    if (medication.medicineName !== undefined) {
        rowData.medicine_name = medication.medicineName.trim();
    }
    if (medication.dosage !== undefined) {
        rowData.dosage = medication.dosage.trim();
    }
    if (medication.frequency !== undefined) {
        rowData.frequency = medication.frequency.trim();
    }
    if (medication.startDate !== undefined) {
        rowData.start_date = medication.startDate.trim();
    }
    if (medication.endDate !== undefined) {
        rowData.end_date = medication.endDate.trim();
    }
    if (medication.instructions !== undefined) {
        rowData.instructions = medication.instructions.trim();
    }
    if (medication.isActive !== undefined) {
        rowData.is_active = medication.isActive;
    }

    if (Object.keys(rowData).length === 0) {
        return null;
    }

    try {
        const document = await databases.updateDocument(
            DATABASE_ID,
            MEDICATIONS_TABLE_ID,
            documentId,
            rowData
        );

        return {
            id: document.$id,
            userId: String(document.user_id || ""),
            medicineName: String(document.medicine_name || ""),
            dosage: String(document.dosage || ""),
            frequency: String(document.frequency || ""),
            startDate: String(document.start_date || ""),
            endDate: document.end_date
                ? String(document.end_date)
                : undefined,
            instructions: document.instructions
                ? String(document.instructions)
                : undefined,
            isActive: Boolean(document.is_active),
        };
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to update medication:",
            {
                tableId: MEDICATIONS_TABLE_ID,
                operation: "updateDocument",
                documentId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return null;
    }
};

/* =========================================================
   DELETE MEDICATION
========================================================= */

export const deleteMedication = async (
    documentId: string
): Promise<boolean> => {
    if (!documentId) {
        return false;
    }

    try {
        await databases.deleteDocument(
            DATABASE_ID,
            MEDICATIONS_TABLE_ID,
            documentId
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to delete medication:",
            {
                tableId: MEDICATIONS_TABLE_ID,
                operation: "deleteDocument",
                documentId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return false;
    }
};

/* =========================================================
   VACCINATIONS DATABASE
========================================================= */

export interface VaccinationData {
    id?: string;
    userId: string;
    vaccineName: string;
    doseNumber?: number;
    scheduledDate?: string;
    takenDate?: string;
    status: string;
    notes?: string;
}

/* =========================================================
   GET USER VACCINATIONS
========================================================= */

export const getUserVaccinations = async (
    userId: string
): Promise<VaccinationData[]> => {
    if (!userId) {
        return [];
    }

    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            VACCINATIONS_TABLE_ID,
            [Query.equal("user_id", userId)]
        );

        return response.documents.map((document: any) => ({
            id: document.$id,
            userId: String(document.user_id || userId),
            vaccineName: String(document.vaccine_name || ""),
            doseNumber:
                document.dose_number !== null &&
                    document.dose_number !== undefined
                    ? Number(document.dose_number)
                    : undefined,
            scheduledDate: document.scheduled_date
                ? String(document.scheduled_date)
                : undefined,
            takenDate: document.taken_date
                ? String(document.taken_date)
                : undefined,
            status: String(document.status || "scheduled"),
            notes: document.notes
                ? String(document.notes)
                : undefined,
        }));
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to load vaccinations:",
            {
                tableId: VACCINATIONS_TABLE_ID,
                operation: "listDocuments",
                userId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return [];
    }
};

/* =========================================================
   CREATE VACCINATION
========================================================= */

export const createVaccination = async (
    vaccination: VaccinationData
): Promise<VaccinationData | null> => {
    if (
        !vaccination.userId ||
        !vaccination.vaccineName.trim() ||
        !vaccination.status.trim()
    ) {
        console.error(
            "[Appwrite] createVaccination: Missing required data"
        );
        return null;
    }

    const activeUser = await getCurrentUser();

    if (
        !activeUser ||
        activeUser.$id !== vaccination.userId
    ) {
        console.error(
            "[Appwrite] createVaccination: User is not authenticated or ID mismatch"
        );
        return null;
    }

    const rowData = {
        user_id: vaccination.userId,
        vaccine_name: vaccination.vaccineName.trim(),
        ...(vaccination.doseNumber !== undefined
            ? { dose_number: vaccination.doseNumber }
            : {}),
        ...(vaccination.scheduledDate
            ? { scheduled_date: vaccination.scheduledDate.trim() }
            : {}),
        ...(vaccination.takenDate
            ? { taken_date: vaccination.takenDate.trim() }
            : {}),
        status: vaccination.status.trim(),
        ...(vaccination.notes
            ? { notes: vaccination.notes.trim() }
            : {}),
    };

    const permissions = [
        Permission.read(Role.user(vaccination.userId)),
        Permission.update(Role.user(vaccination.userId)),
        Permission.delete(Role.user(vaccination.userId)),
    ];

    try {
        const document = await databases.createDocument(
            DATABASE_ID,
            VACCINATIONS_TABLE_ID,
            ID.unique(),
            rowData,
            permissions
        );

        return {
            id: document.$id,
            userId: String(
                document.user_id || vaccination.userId
            ),
            vaccineName: String(
                document.vaccine_name || vaccination.vaccineName
            ),
            doseNumber:
                document.dose_number !== null &&
                    document.dose_number !== undefined
                    ? Number(document.dose_number)
                    : vaccination.doseNumber,
            scheduledDate: document.scheduled_date
                ? String(document.scheduled_date)
                : vaccination.scheduledDate,
            takenDate: document.taken_date
                ? String(document.taken_date)
                : vaccination.takenDate,
            status: String(
                document.status || vaccination.status
            ),
            notes: document.notes
                ? String(document.notes)
                : vaccination.notes,
        };
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to create vaccination:",
            {
                tableId: VACCINATIONS_TABLE_ID,
                operation: "createDocument",
                userId: vaccination.userId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return null;
    }
};

/* =========================================================
   UPDATE VACCINATION
========================================================= */

export const updateVaccination = async (
    documentId: string,
    vaccination: Partial<Omit<VaccinationData, "id" | "userId">>
): Promise<VaccinationData | null> => {
    if (!documentId) {
        return null;
    }

    const rowData: Record<string, unknown> = {};

    if (vaccination.vaccineName !== undefined) {
        rowData.vaccine_name = vaccination.vaccineName.trim();
    }
    if (vaccination.doseNumber !== undefined) {
        rowData.dose_number = vaccination.doseNumber;
    }
    if (vaccination.scheduledDate !== undefined) {
        rowData.scheduled_date = vaccination.scheduledDate.trim();
    }
    if (vaccination.takenDate !== undefined) {
        rowData.taken_date = vaccination.takenDate.trim();
    }
    if (vaccination.status !== undefined) {
        rowData.status = vaccination.status.trim();
    }
    if (vaccination.notes !== undefined) {
        rowData.notes = vaccination.notes.trim();
    }

    if (Object.keys(rowData).length === 0) {
        return null;
    }

    try {
        const document = await databases.updateDocument(
            DATABASE_ID,
            VACCINATIONS_TABLE_ID,
            documentId,
            rowData
        );

        return {
            id: document.$id,
            userId: String(document.user_id || ""),
            vaccineName: String(document.vaccine_name || ""),
            doseNumber:
                document.dose_number !== null &&
                    document.dose_number !== undefined
                    ? Number(document.dose_number)
                    : undefined,
            scheduledDate: document.scheduled_date
                ? String(document.scheduled_date)
                : undefined,
            takenDate: document.taken_date
                ? String(document.taken_date)
                : undefined,
            status: String(document.status || ""),
            notes: document.notes
                ? String(document.notes)
                : undefined,
        };
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to update vaccination:",
            {
                tableId: VACCINATIONS_TABLE_ID,
                operation: "updateDocument",
                documentId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return null;
    }
};

/* =========================================================
   DELETE VACCINATION
========================================================= */

export const deleteVaccination = async (
    documentId: string
): Promise<boolean> => {
    if (!documentId) {
        return false;
    }

    try {
        await databases.deleteDocument(
            DATABASE_ID,
            VACCINATIONS_TABLE_ID,
            documentId
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to delete vaccination:",
            {
                tableId: VACCINATIONS_TABLE_ID,
                operation: "deleteDocument",
                documentId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return false;
    }
};

/* =========================================================
   EMERGENCY CONTACTS DATABASE
========================================================= */

export interface EmergencyContactData {
    id?: string;
    userId: string;
    name: string;
    phone: string;
    relation?: string;
    isPrimary?: boolean;
}

/* =========================================================
   GET USER EMERGENCY CONTACTS
========================================================= */

export const getUserEmergencyContacts = async (
    userId: string
): Promise<EmergencyContactData[]> => {
    if (!userId) {
        return [];
    }

    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            EMERGENCY_CONTACTS_TABLE_ID,
            [Query.equal("user_id", userId)]
        );

        return response.documents.map((document: any) => ({
            id: document.$id,
            userId: String(document.user_id || userId),
            name: String(document.name || ""),
            phone: String(document.phone || ""),
            relation: document.relation
                ? String(document.relation)
                : undefined,
            isPrimary:
                document.is_primary !== null &&
                    document.is_primary !== undefined
                    ? Boolean(document.is_primary)
                    : undefined,
        }));
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to load emergency contacts:",
            {
                tableId: EMERGENCY_CONTACTS_TABLE_ID,
                operation: "listDocuments",
                userId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return [];
    }
};

/* =========================================================
   CREATE EMERGENCY CONTACT
========================================================= */

export const createEmergencyContact = async (
    contact: EmergencyContactData
): Promise<EmergencyContactData | null> => {
    if (
        !contact.userId ||
        !contact.name.trim() ||
        !contact.phone.trim()
    ) {
        console.error(
            "[Appwrite] createEmergencyContact: Missing required data"
        );
        return null;
    }

    const activeUser = await getCurrentUser();

    if (
        !activeUser ||
        activeUser.$id !== contact.userId
    ) {
        console.error(
            "[Appwrite] createEmergencyContact: User is not authenticated or ID mismatch"
        );
        return null;
    }

    const rowData = {
        user_id: contact.userId,
        name: contact.name.trim(),
        phone: contact.phone.trim(),
        ...(contact.relation
            ? { relation: contact.relation.trim() }
            : {}),
        ...(contact.isPrimary !== undefined
            ? { is_primary: contact.isPrimary }
            : {}),
    };

    const permissions = [
        Permission.read(Role.user(contact.userId)),
        Permission.update(Role.user(contact.userId)),
        Permission.delete(Role.user(contact.userId)),
    ];

    try {
        const document = await databases.createDocument(
            DATABASE_ID,
            EMERGENCY_CONTACTS_TABLE_ID,
            ID.unique(),
            rowData,
            permissions
        );

        return {
            id: document.$id,
            userId: String(document.user_id || contact.userId),
            name: String(document.name || contact.name),
            phone: String(document.phone || contact.phone),
            relation: document.relation
                ? String(document.relation)
                : contact.relation,
            isPrimary:
                document.is_primary !== null &&
                    document.is_primary !== undefined
                    ? Boolean(document.is_primary)
                    : contact.isPrimary,
        };
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to create emergency contact:",
            {
                tableId: EMERGENCY_CONTACTS_TABLE_ID,
                operation: "createDocument",
                userId: contact.userId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return null;
    }
};

/* =========================================================
   UPDATE EMERGENCY CONTACT
========================================================= */

export const updateEmergencyContact = async (
    documentId: string,
    contact: Partial<Omit<EmergencyContactData, "id" | "userId">>
): Promise<EmergencyContactData | null> => {
    if (!documentId) {
        return null;
    }

    const rowData: Record<string, unknown> = {};

    if (contact.name !== undefined) {
        rowData.name = contact.name.trim();
    }
    if (contact.phone !== undefined) {
        rowData.phone = contact.phone.trim();
    }
    if (contact.relation !== undefined) {
        rowData.relation = contact.relation.trim();
    }
    if (contact.isPrimary !== undefined) {
        rowData.is_primary = contact.isPrimary;
    }

    if (Object.keys(rowData).length === 0) {
        return null;
    }

    try {
        const document = await databases.updateDocument(
            DATABASE_ID,
            EMERGENCY_CONTACTS_TABLE_ID,
            documentId,
            rowData
        );

        return {
            id: document.$id,
            userId: String(document.user_id || ""),
            name: String(document.name || ""),
            phone: String(document.phone || ""),
            relation: document.relation
                ? String(document.relation)
                : undefined,
            isPrimary:
                document.is_primary !== null &&
                    document.is_primary !== undefined
                    ? Boolean(document.is_primary)
                    : undefined,
        };
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to update emergency contact:",
            {
                tableId: EMERGENCY_CONTACTS_TABLE_ID,
                operation: "updateDocument",
                documentId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return null;
    }
};

/* =========================================================
   DELETE EMERGENCY CONTACT
========================================================= */

export const deleteEmergencyContact = async (
    documentId: string
): Promise<boolean> => {
    if (!documentId) {
        return false;
    }

    try {
        await databases.deleteDocument(
            DATABASE_ID,
            EMERGENCY_CONTACTS_TABLE_ID,
            documentId
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to delete emergency contact:",
            {
                tableId: EMERGENCY_CONTACTS_TABLE_ID,
                operation: "deleteDocument",
                documentId,
                code: error?.code,
                type: error?.type,
                message: error?.message || error,
            }
        );

        return false;
    }
};

/* =========================================================
   BABY NAME FAVOURITES DATABASE
========================================================= */

export interface BabyNameFavouriteData {
    id?: string;
    userId: string;
    nameId: string;
    name: string;
    meaning: string;
    gender: string;
    origin: string;
}

/* =========================================================
   GET BABY NAME FAVOURITES
========================================================= */

export const getUserBabyNameFavourites = async (
    userId: string
): Promise<BabyNameFavouriteData[]> => {
    if (!userId) {
        return [];
    }

    try {
        const response =
            await databases.listDocuments(
                DATABASE_ID,
                BABY_NAME_FAVOURITES_TABLE_ID,
                [
                    Query.equal(
                        "user_id",
                        userId
                    ),
                ]
            );

        return response.documents.map(
            (doc: any) => ({
                id: doc.$id,
                userId: String(
                    doc.user_id || userId
                ),
                nameId: String(
                    doc.name_id || ""
                ),
                name: String(
                    doc.name || ""
                ),
                meaning: String(
                    doc.meaning || ""
                ),
                gender: String(
                    doc.gender || ""
                ),
                origin: String(
                    doc.origin || ""
                ),
            })
        );
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to load baby name favourites:",
            {
                tableId:
                    BABY_NAME_FAVOURITES_TABLE_ID,
                operation:
                    "listDocuments",
                userId,
                code: error?.code,
                type: error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return [];
    }
};

/* =========================================================
   CREATE BABY NAME FAVOURITE
========================================================= */

export const createBabyNameFavourite = async (
    favourite: BabyNameFavouriteData
): Promise<BabyNameFavouriteData | null> => {
    if (
        !favourite.userId ||
        !favourite.nameId ||
        !favourite.name
    ) {
        console.error(
            "[Appwrite] createBabyNameFavourite: Missing required data"
        );
        return null;
    }

    const activeUser =
        await getCurrentUser();

    if (
        !activeUser ||
        activeUser.$id !==
        favourite.userId
    ) {
        console.error(
            "[Appwrite] createBabyNameFavourite: User is not authenticated or ID mismatch"
        );
        return null;
    }

    const rowData = {
        user_id:
            favourite.userId,
        name_id:
            favourite.nameId,
        name:
            favourite.name,
        meaning:
            favourite.meaning,
        gender:
            favourite.gender,
        origin:
            favourite.origin,
    };

    const permissions = [
        Permission.read(
            Role.user(favourite.userId)
        ),
        Permission.update(
            Role.user(favourite.userId)
        ),
        Permission.delete(
            Role.user(favourite.userId)
        ),
    ];

    try {
        const document =
            await databases.createDocument(
                DATABASE_ID,
                BABY_NAME_FAVOURITES_TABLE_ID,
                ID.unique(),
                rowData,
                permissions
            );

        return {
            id: document.$id,
            userId: String(
                document.user_id ||
                favourite.userId
            ),
            nameId: String(
                document.name_id ||
                favourite.nameId
            ),
            name: String(
                document.name ||
                favourite.name
            ),
            meaning: String(
                document.meaning ||
                favourite.meaning
            ),
            gender: String(
                document.gender ||
                favourite.gender
            ),
            origin: String(
                document.origin ||
                favourite.origin
            ),
        };
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to create baby name favourite:",
            {
                tableId:
                    BABY_NAME_FAVOURITES_TABLE_ID,
                operation:
                    "createDocument",
                userId:
                    favourite.userId,
                code: error?.code,
                type: error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return null;
    }
};

/* =========================================================
   DELETE BABY NAME FAVOURITE
========================================================= */

export const deleteBabyNameFavourite = async (
    documentId: string
): Promise<boolean> => {
    if (!documentId) {
        return false;
    }

    try {
        await databases.deleteDocument(
            DATABASE_ID,
            BABY_NAME_FAVOURITES_TABLE_ID,
            documentId
        );

        return true;
    } catch (error: any) {
        console.error(
            "[Appwrite] Failed to delete baby name favourite:",
            {
                tableId:
                    BABY_NAME_FAVOURITES_TABLE_ID,
                operation:
                    "deleteDocument",
                documentId,
                code: error?.code,
                type: error?.type,
                message:
                    error?.message ||
                    error,
            }
        );

        return false;
    }
};

