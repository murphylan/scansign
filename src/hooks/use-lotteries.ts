"use client";

// 1. React
import { useCallback, useState, useTransition } from "react";

// 2. Next.js
import { useRouter } from "next/navigation";

// 3. Third-party
import { toast } from "sonner";

// 4. Server Actions
import {
  listLotteriesAction,
  getLotteryAction,
  createLotteryAction,
  updateLotteryAction,
  deleteLotteryAction,
  drawLotteryAction,
  getLotteryParticipantsAction,
  getLotteryWinnersAction,
} from "@/server/actions/lotteryAction";

// 5. Types
import type { LotteryFormData } from "@/server/actions/lotteryAction";

export function useLotteries() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lotteries, setLotteries] = useState<unknown[]>([]);
  const [currentLottery, setCurrentLottery] = useState<unknown | null>(null);
  const [participants, setParticipants] = useState<unknown[]>([]);
  const [winners, setWinners] = useState<unknown[]>([]);

  const loadLotteries = useCallback(async () => {
    startTransition(async () => {
      const res = await listLotteriesAction();

      if (res.success) {
        setLotteries(res.data || []);
      } else {
        toast.error(res.error || "获取抽奖列表失败");
      }
    });
  }, []);

  const loadLottery = useCallback(async (id: string) => {
    startTransition(async () => {
      const res = await getLotteryAction(id);

      if (res.success) {
        setCurrentLottery(res.data);
      } else {
        toast.error(res.error || "获取抽奖失败");
      }
    });
  }, []);

  const createLottery = useCallback(
    async (data: LotteryFormData) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await createLotteryAction(data);

          if (res.success) {
            toast.success("创建成功");
            router.push("/lotteries");
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

  const updateLottery = useCallback(
    async (id: string, data: Partial<LotteryFormData> & { status?: string }) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await updateLotteryAction(id, data);

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

  const deleteLottery = useCallback(
    async (id: string) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await deleteLotteryAction(id);

          if (res.success) {
            toast.success("删除成功");
            router.push("/lotteries");
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

  const drawLottery = useCallback(async (id: string, count: number = 1) => {
    return new Promise<unknown[]>((resolve) => {
      startTransition(async () => {
        const res = await drawLotteryAction(id, count);

        if (res.success) {
          toast.success(`抽出 ${res.data?.length || 0} 位中奖者`);
          resolve(res.data || []);
        } else {
          toast.error(res.error || "抽奖失败");
          resolve([]);
        }
      });
    });
  }, []);

  const loadParticipants = useCallback(async (lotteryId: string) => {
    startTransition(async () => {
      const res = await getLotteryParticipantsAction(lotteryId);

      if (res.success) {
        setParticipants(res.data || []);
      } else {
        toast.error(res.error || "获取参与者失败");
      }
    });
  }, []);

  const loadWinners = useCallback(async (lotteryId: string) => {
    startTransition(async () => {
      const res = await getLotteryWinnersAction(lotteryId);

      if (res.success) {
        setWinners(res.data || []);
      } else {
        toast.error(res.error || "获取获奖者失败");
      }
    });
  }, []);

  return {
    lotteries,
    currentLottery,
    participants,
    winners,
    isPending,
    loadLotteries,
    loadLottery,
    createLottery,
    updateLottery,
    deleteLottery,
    drawLottery,
    loadParticipants,
    loadWinners,
  };
}

