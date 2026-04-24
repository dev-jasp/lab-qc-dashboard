import { useEffect, useState } from 'react';

import { getSession, signIn, signOut } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    getSession().then((session) => {
      if (isCancelled) {
        return;
      }

      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    user,
    loading,
    isAuthenticated: user !== null,
    role: user?.role ?? null,
    initials: user?.initials ?? '',
    isAdmin: user?.role === 'Admin',
    isSupervisor: user?.role === 'Supervisor' || user?.role === 'Admin',
    isAnalyst: true,
    signIn,
    signOut,
  };
}
