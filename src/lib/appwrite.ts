import { Client, Account, ID, Databases, TablesDB, Permission, Role } from "appwrite";

const client = new Client()
    .setEndpoint(
        import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"
    )
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || "");

export const account = new Account(client);
export const databases = new Databases(client);
export const tablesDB = new TablesDB(client);

const DATABASE_ID = "mathreya-26";
const USER_PROFILES_TABLE_ID = "user_profiles";

/* =========================
   AUTH & REGISTRATION FLOW
========================= */

export async function signup(
    email: string,
    password: string,
    name: string,
    lifeStage: string = "pregnancy_prenatal"
) {
    // 1. Safely handle pre-existing active session before registration
    const existingSessionUser = await getCurrentUser();
    if (existingSessionUser) {
        try {
            await logout();
        } catch {
            // Non-critical if session was already invalid
        }
    }

    // 2. Create the Appwrite Auth user
    const user = await account.create({
        userId: ID.unique(),
        email,
        password,
        name,
    });

    // 3. Create the Appwrite email/password session safely
    try {
        await account.createEmailPasswordSession({
            email,
            password,
        });
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg.includes("prohibited when a session is active")) {
            try {
                await logout();
                await account.createEmailPasswordSession({ email, password });
            } catch {
                // Ignore if session was restored
            }
        } else {
            throw err;
        }
    }

    // 4. Get current authenticated Appwrite user
    const currentUser = await getCurrentUser();
    const activeUserId = currentUser?.$id || user.$id;

    if (!activeUserId) {
        throw new Error("Missing required attribute user_id");
    }

    // 5. Create user_profiles row with exact column keys
    try {
        await createUserProfile({
            user_id: activeUserId,
            name,
            email,
            phone: "",
            LifeStage: lifeStage,
        });
    } catch (error) {
        console.error("Appwrite user_profiles creation warning:", error);
    }

    return currentUser || user;
}

export async function login(email: string, password: string) {
    // Safely check if an active session already exists for this browser
    const currentUser = await getCurrentUser();
    if (currentUser) {
        if (currentUser.email.toLowerCase() === email.toLowerCase()) {
            // Already authenticated as this user
            return { current: true };
        }
        // Active session belongs to another user, logout first
        try {
            await logout();
        } catch {
            // Non-critical
        }
    }

    return await account.createEmailPasswordSession({
        email,
        password,
    });
}

export async function logout() {
    try {
        return await account.deleteSession({
            sessionId: "current",
        });
    } catch (error) {
        console.error("Appwrite logout notice:", error);
        return null;
    }
}

export async function getCurrentUser() {
    try {
        return await account.get();
    } catch {
        return null;
    }
}

/* =========================
   PASSWORD RECOVERY
========================= */

export async function createPasswordRecovery(email: string) {
    const redirectUrl =
        window.location.origin + window.location.pathname;

    return await account.createRecovery({
        email,
        url: redirectUrl,
    });
}

export async function completePasswordReset(
    userId: string,
    secret: string,
    password: string
) {
    return await account.updateRecovery({
        userId,
        secret,
        password,
    });
}

/* =========================
   EMAIL OTP
========================= */

export async function sendEmailOTP(email: string) {
    return await account.createEmailToken({
        userId: ID.unique(),
        email,
    });
}

export async function verifyEmailOTP(
    userId: string,
    secret: string
) {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        if (currentUser.$id === userId) {
            return { current: true };
        }
        try {
            await logout();
        } catch {
            // Non-critical
        }
    }

    return await account.createSession({
        userId,
        secret,
    });
}

/* =========================
   USER PROFILE DATABASE
========================= */

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
        throw new Error("Missing required attribute user_id");
    }

    const rowData = {
        user_id: profile.user_id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone ?? "",
        LifeStage: profile.LifeStage ?? "",
    };

    const rowPermissions = [
        Permission.read(Role.user(profile.user_id)),
        Permission.update(Role.user(profile.user_id)),
        Permission.delete(Role.user(profile.user_id)),
    ];

    try {
        return await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: USER_PROFILES_TABLE_ID,
            rowId: ID.unique(),
            data: rowData,
            permissions: rowPermissions,
        });
    } catch {
        return await databases.createDocument({
            databaseId: DATABASE_ID,
            collectionId: USER_PROFILES_TABLE_ID,
            documentId: ID.unique(),
            data: rowData,
            permissions: rowPermissions,
        });
    }
}

export async function getUserProfile(userId: string) {
    try {
        const result = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: USER_PROFILES_TABLE_ID,
        });

        return (
            result.rows.find(
                (row) =>
                    (row as unknown as Record<string, unknown>).user_id === userId ||
                    (row as unknown as Record<string, unknown>).userId === userId
            ) ?? null
        );
    } catch {
        try {
            const result = await databases.listDocuments({
                databaseId: DATABASE_ID,
                collectionId: USER_PROFILES_TABLE_ID,
            });

            return (
                result.documents.find(
                    (doc) =>
                        (doc as unknown as Record<string, unknown>).user_id === userId ||
                        (doc as unknown as Record<string, unknown>).userId === userId
                ) ?? null
            );
        } catch {
            return null;
        }
    }
}

export async function updateUserProfile(
    rowId: string,
    data: Partial<UserProfileData>
) {
    try {
        return await tablesDB.updateRow({
            databaseId: DATABASE_ID,
            tableId: USER_PROFILES_TABLE_ID,
            rowId,
            data,
        });
    } catch {
        return await databases.updateDocument({
            databaseId: DATABASE_ID,
            collectionId: USER_PROFILES_TABLE_ID,
            documentId: rowId,
            data,
        });
    }
}

export default client;