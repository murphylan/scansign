"use client";

// 1. React
import { useCallback, useState, useTransition } from "react";

// 2. Next.js
import { useRouter } from "next/navigation";

// 3. Third-party
import { toast } from "sonner";

// 4. Server Actions
import {
  listVotesAction,
  getVoteAction,
  createVoteAction,
  updateVoteAction,
  deleteVoteAction,
} from "@/server/actions/voteAction";

// 5. Types
import type { VoteFormData } from "@/server/actions/voteAction";

export function useVotes() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [votes, setVotes] = useState<unknown[]>([]);
  const [currentVote, setCurrentVote] = useState<unknown | null>(null);

  const loadVotes = useCallback(async () => {
    startTransition(async () => {
      const res = await listVotesAction();

      if (res.success) {
        setVotes(res.data || []);
      } else {
        toast.error(res.error || "获取投票列表失败");
      }
    });
  }, []);

  const loadVote = useCallback(async (id: string) => {
    startTransition(async () => {
      const res = await getVoteAction(id);

      if (res.success) {
        setCurrentVote(res.data);
      } else {
        toast.error(res.error || "获取投票失败");
      }
    });
  }, []);

  const createVote = useCallback(
    async (data: VoteFormData) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await createVoteAction(data);

          if (res.success) {
            toast.success("创建成功");
            router.push("/votes");
            resolve(true);
          } else {
            toast.error(res.error || "创建失败");
            resolve(false);
          }
        });
      });
    },
    [router]
  );

  const updateVote = useCallback(
    async (id: string, data: Partial<VoteFormData> & { status?: string }) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await updateVoteAction(id, data);

          if (res.success) {
            toast.success("更新成功");
            resolve(true);
          } else {
            toast.error(res.error || "更新失败");
            resolve(false);
          }
        });
      });
    },
    []
  );

  const deleteVote = useCallback(
    async (id: string) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await deleteVoteAction(id);

          if (res.success) {
            toast.success("删除成功");
            router.push("/votes");
            resolve(true);
          } else {
            toast.error(res.error || "删除失败");
            resolve(false);
          }
        });
      });
    },
    [router]
  );

  return {
    votes,
    currentVote,
    isPending,
    loadVotes,
    loadVote,
    createVote,
    updateVote,
    deleteVote,
  };
}

