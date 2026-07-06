import type { Metadata } from "next";
import { getVoteByCodeAction } from "@/server/actions/publicAction";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const res = await getVoteByCodeAction(code);
  const data =
    res?.success && res.data
      ? (res.data as { title?: string; description?: string })
      : undefined;
  const name = data?.title || "投票";
  const title = `${name} · Sign 投票`;
  const description = data?.description || `参与「${name}」投票，实时查看开票结果`;
  return {
    title,
    description,
    openGraph: { title, description, images: ["/og/vote.png"] },
  };
}

export default function VoteShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
