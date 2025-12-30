import { redirect } from "next/navigation";

import { getCurrentUser, initAdminUser } from "@/server/actions/authAction";
import { getTrialDaysRemaining, canUseService } from "@/lib/auth-utils";
import { Sidebar } from "@/components/admin/sidebar";
import { UserProvider } from "@/components/auth/auth-guard";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 初始化管理员账户（如果不存在）
  await initAdminUser();

  // 获取当前用户
  const user = await getCurrentUser();

  // 未登录，跳转到登录页
  if (!user) {
    redirect("/login");
  }

  // 准备用户信息
  const userInfo = {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    trialDaysRemaining: getTrialDaysRemaining(user),
    canUseService: canUseService(user),
    isPaid: user.isPaid,
  };

  // 试用期已过且未付费
  if (!userInfo.canUseService) {
    redirect("/expired");
  }

  return (
    <UserProvider user={userInfo}>
      <div className="min-h-screen bg-background">
        <Sidebar user={userInfo} />

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-4 lg:px-6">
            <div className="flex-1" />
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </UserProvider>
  );
}
