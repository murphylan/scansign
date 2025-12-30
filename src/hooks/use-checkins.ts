"use client";

// 1. React
import { useCallback, useState, useTransition } from "react";

// 2. Next.js
import { useRouter } from "next/navigation";

// 3. Third-party
import { toast } from "sonner";

// 4. Server Actions
import {
  listCheckinsAction,
  getCheckinAction,
  createCheckinAction,
  updateCheckinAction,
  deleteCheckinAction,
  getCheckinRecordsAction,
} from "@/server/actions/checkinAction";

// 5. Types
import type { CheckinFormData } from "@/server/actions/checkinAction";

export function useCheckins() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checkins, setCheckins] = useState<unknown[]>([]);
  const [currentCheckin, setCurrentCheckin] = useState<unknown | null>(null);
  const [records, setRecords] = useState<unknown[]>([]);

  const loadCheckins = useCallback(async () => {
    startTransition(async () => {
      const res = await listCheckinsAction();

      if (res.success) {
        setCheckins(res.data || []);
      } else {
        toast.error(res.error || "获取签到列表失败");
      }
    });
  }, []);

  const loadCheckin = useCallback(async (id: string) => {
    startTransition(async () => {
      const res = await getCheckinAction(id);

      if (res.success) {
        setCurrentCheckin(res.data);
      } else {
        toast.error(res.error || "获取签到失败");
      }
    });
  }, []);

  const createCheckin = useCallback(
    async (data: CheckinFormData) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await createCheckinAction(data);

          if (res.success) {
            toast.success("创建成功");
            router.push("/checkins");
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

  const updateCheckin = useCallback(
    async (id: string, data: Partial<CheckinFormData> & { status?: string }) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await updateCheckinAction(id, data);

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

  const deleteCheckin = useCallback(
    async (id: string) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await deleteCheckinAction(id);

          if (res.success) {
            toast.success("删除成功");
            router.push("/checkins");
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

  const loadRecords = useCallback(async (checkinId: string, limit?: number) => {
    startTransition(async () => {
      const res = await getCheckinRecordsAction(checkinId, limit);

      if (res.success) {
        setRecords(res.data || []);
      } else {
        toast.error(res.error || "获取记录失败");
      }
    });
  }, []);

  return {
    checkins,
    currentCheckin,
    records,
    isPending,
    loadCheckins,
    loadCheckin,
    createCheckin,
    updateCheckin,
    deleteCheckin,
    loadRecords,
  };
}

