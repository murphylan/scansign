'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  nickname: string | null;
  role: 'USER' | 'ADMIN';
  trialDaysRemaining: number;
  canUseService: boolean;
  isPaid: boolean;
}

interface AuthGuardProps {
  children: React.ReactNode;
  user: User;
}

export function AuthGuard({ children, user }: AuthGuardProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (!user.canUseService) {
      // 试用期已过且未付费
      router.push('/expired');
    } else {
      setChecked(true);
    }
  }, [user, router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

// 用户信息上下文
import { createContext, useContext } from 'react';

const UserContext = createContext<User | null>(null);

export function UserProvider({ children, user }: { children: React.ReactNode; user: User }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return user;
}

