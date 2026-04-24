export type UserRole = 'Admin' | 'Supervisor' | 'Analyst';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  initials: string;
};

export type AuthSession = {
  user: AuthUser;
  loginTime: string;
  expiresAt: string;
};

type MockUser = AuthUser & {
  password: string;
};

const SESSION_KEY = 'qc_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const MOCK_USERS: MockUser[] = [
  {
    id: 'mock-admin',
    email: 'admin@vpdrl.com',
    password: 'Admin@2025',
    role: 'Admin',
    name: 'Lab Administrator',
    initials: 'LA',
  },
  {
    id: 'mock-supervisor',
    email: 'supervisor@vpdrl.com',
    password: 'Super@2025',
    role: 'Supervisor',
    name: 'Lab Supervisor',
    initials: 'LS',
  },
  {
    id: 'mock-analyst',
    email: 'analyst@vpdrl.com',
    password: 'Analyst@2025',
    role: 'Analyst',
    name: 'QC Analyst',
    initials: 'QA',
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'Admin' || value === 'Supervisor' || value === 'Analyst';
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    typeof value.name === 'string' &&
    isUserRole(value.role) &&
    typeof value.initials === 'string'
  );
}

function isAuthSession(value: unknown): value is AuthSession {
  return (
    isRecord(value) &&
    isAuthUser(value.user) &&
    typeof value.loginTime === 'string' &&
    typeof value.expiresAt === 'string'
  );
}

function createSession(user: AuthUser): AuthSession {
  const loginDate = new Date();

  return {
    user,
    loginTime: loginDate.toISOString(),
    expiresAt: new Date(loginDate.getTime() + SESSION_DURATION_MS).toISOString(),
  };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ user: AuthUser } | { error: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail.length === 0) {
    return { error: 'Email is required' };
  }

  if (password.length === 0) {
    return { error: 'Password is required' };
  }

  const mockUser = MOCK_USERS.find(
    (user) => user.email.toLowerCase() === normalizedEmail && user.password === password,
  );

  if (mockUser === undefined) {
    return { error: 'Invalid email or password' };
  }

  const user: AuthUser = {
    id: mockUser.id,
    email: mockUser.email,
    name: mockUser.name,
    role: mockUser.role,
    initials: mockUser.initials,
  };
  const session = createSession(user);
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return { user };
}

export async function signOut(): Promise<void> {
  window.sessionStorage.removeItem(SESSION_KEY);
}

export async function getSession(): Promise<AuthSession | null> {
  const rawSession = window.sessionStorage.getItem(SESSION_KEY);

  if (rawSession === null) {
    return null;
  }

  try {
    const parsedSession: unknown = JSON.parse(rawSession);

    if (!isAuthSession(parsedSession)) {
      await signOut();
      return null;
    }

    if (isSessionExpired(parsedSession)) {
      await signOut();
      return null;
    }

    return parsedSession;
  } catch {
    await signOut();
    return null;
  }
}

export async function getUser(): Promise<AuthUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export function isSessionExpired(session: AuthSession): boolean {
  return new Date() > new Date(session.expiresAt);
}
