import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/actions/authAction";
import { OPS_SUPER_USER_EMAIL } from "@/config/ops";
import { DesktopOnlyShell } from "@/components/ops/desktop-only-shell";

export default async function OpsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.email !== OPS_SUPER_USER_EMAIL) {
    redirect("/");
  }

  return <DesktopOnlyShell>{children}</DesktopOnlyShell>;
}
