import { redirect } from "next/navigation";

import { getCurrentUser, initAdminUser } from "@/server/actions/authAction";
import {
  getTrialDaysRemaining,
  canUseService,
  hasActivePaidSubscription,
  getTrialEndsAt,
} from "@/lib/auth-utils";
import { Sidebar } from "@/components/admin/sidebar";
import { MobileHeader } from "@/components/admin/mobile-header";
import { BottomNav } from "@/components/admin/bottom-nav";
import { UserProvider } from "@/components/auth/auth-guard";
import { PresenceBeacon } from "@/components/auth/presence-beacon";
import { OPS_SUPER_USER_EMAIL } from "@/config/ops";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await initAdminUser();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userInfo = {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    trialDaysRemaining: getTrialDaysRemaining(user),
    canUseService: canUseService(user),
    isPaid: user.isPaid,
    subscriptionPlan: user.subscriptionPlan ?? null,
    subscriptionEndsAt: user.subscriptionEndsAt?.toISOString() ?? null,
    trialEndsAtIso: getTrialEndsAt(user).toISOString(),
    hasActivePaidSubscription: hasActivePaidSubscription(user),
    isOpsConsoleUser: user.email === OPS_SUPER_USER_EMAIL,
  };

  if (!userInfo.canUseService) {
    redirect("/expired");
  }

  return (
    <UserProvider user={userInfo}>
      <PresenceBeacon />
      <div className="min-h-screen bg-page flex flex-col lg:block">
        <Sidebar user={userInfo} />
        <MobileHeader user={userInfo} />

        <div className="lg:pl-64 flex-1 flex flex-col pt-12 pb-[60px] lg:pt-0 lg:pb-0">
          <main className="flex-1 flex flex-col px-4 py-4 lg:p-6">
            {children}
          </main>
        </div>

        <BottomNav />
      </div>
    </UserProvider>
  );
}
