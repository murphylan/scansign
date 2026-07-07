import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/actions/authAction";
import { OPS_SUPER_USER_PHONE } from "@/config/ops";
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

  if (user.phone !== OPS_SUPER_USER_PHONE) {
    redirect("/");
  }

  return <DesktopOnlyShell>{children}</DesktopOnlyShell>;
}
