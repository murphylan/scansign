import type { Metadata } from "next";
import { getLotteryByCodeAction } from "@/server/actions/publicAction";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const res = await getLotteryByCodeAction(code);
  const data =
    res?.success && res.data
      ? (res.data as { title?: string; description?: string })
      : undefined;
  const name = data?.title || "抽奖";
  const title = `${name} · Sign 抽奖`;
  const description = data?.description || `参与「${name}」抽奖，现场大屏开奖`;
  return {
    title,
    description,
    openGraph: { title, description, images: ["/og/lottery.png"] },
  };
}

export default function LotteryShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
