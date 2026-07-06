import type { Metadata } from "next";
import { getFormByCodeAction } from "@/server/actions/publicAction";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const res = await getFormByCodeAction(code);
  const data =
    res?.success && res.data
      ? (res.data as { title?: string; description?: string })
      : undefined;
  const name = data?.title || "表单";
  const title = `${name} · Sign 表单`;
  const description = data?.description || `填写「${name}」，快速提交信息`;
  return {
    title,
    description,
    openGraph: { title, description, images: ["/og/form.png"] },
  };
}

export default function FormShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
