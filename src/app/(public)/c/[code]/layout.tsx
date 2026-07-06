import type { Metadata } from "next";
import { getCheckinByCodeAction } from "@/server/actions/publicAction";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const res = await getCheckinByCodeAction(code);
  const data =
    res?.success && res.data
      ? (res.data as { title?: string; description?: string })
      : undefined;
  const name = data?.title || "签到";
  const title = `${name} · Sign 签到`;
  const description = data?.description || `扫码参与「${name}」，实时大屏互动`;
  return {
    title,
    description,
    openGraph: { title, description, images: ["/og/checkin.png"] },
  };
}

export default function CheckinShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
