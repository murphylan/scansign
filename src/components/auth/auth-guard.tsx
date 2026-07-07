"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import type { SubscriptionPlan } from "@/types/user-types";

export interface SessionUser {
  id: string;
  phone: string;
  nickname: string | null;
  role: "USER" | "ADMIN";
  trialDaysRemaining: number;
  canUseService: boolean;
  isPaid: boolean;
  subscriptionPlan: SubscriptionPlan | null;
  subscriptionEndsAt: string | null;
  trialEndsAtIso: string;
  hasActivePaidSubscription: boolean;
  /** 可访问 /ops/console 的运营账号 */
  isOpsConsoleUser: boolean;
}

interface AuthGuardProps {
  children: React.ReactNode;
  user: SessionUser;
}

export function AuthGuard({ children, user }: AuthGuardProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else if (!user.canUseService) {
      router.push("/expired");
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

const UserContext = createContext<SessionUser | null>(null);

export function UserProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return user;
}
