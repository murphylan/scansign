"use client";

// 1. React
import { useCallback, useState, useTransition } from "react";

// 2. Next.js
import { useRouter } from "next/navigation";

// 3. Third-party
import { toast } from "sonner";

// 4. Server Actions
import {
  listFormsAction,
  getFormAction,
  createFormAction,
  updateFormAction,
  deleteFormAction,
  getFormResponsesAction,
} from "@/server/actions/formAction";

// 5. Types
import type { FormFormData } from "@/server/actions/formAction";

export function useForms() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [forms, setForms] = useState<unknown[]>([]);
  const [currentForm, setCurrentForm] = useState<unknown | null>(null);
  const [responses, setResponses] = useState<unknown[]>([]);

  const loadForms = useCallback(async () => {
    startTransition(async () => {
      const res = await listFormsAction();

      if (res.success) {
        setForms(res.data || []);
      } else {
        toast.error(res.error || "获取表单列表失败");
      }
    });
  }, []);

  const loadForm = useCallback(async (id: string) => {
    startTransition(async () => {
      const res = await getFormAction(id);

      if (res.success) {
        setCurrentForm(res.data);
      } else {
        toast.error(res.error || "获取表单失败");
      }
    });
  }, []);

  const createForm = useCallback(
    async (data: FormFormData) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await createFormAction(data);

          if (res.success) {
            toast.success("创建成功");
            router.push("/forms");
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

  const updateForm = useCallback(
    async (id: string, data: Partial<FormFormData> & { status?: string }) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await updateFormAction(id, data);

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

  const deleteForm = useCallback(
    async (id: string) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await deleteFormAction(id);

          if (res.success) {
            toast.success("删除成功");
            router.push("/forms");
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

  const loadResponses = useCallback(async (formId: string, limit?: number) => {
    startTransition(async () => {
      const res = await getFormResponsesAction(formId, limit);

      if (res.success) {
        setResponses(res.data || []);
      } else {
        toast.error(res.error || "获取响应失败");
      }
    });
  }, []);

  return {
    forms,
    currentForm,
    responses,
    isPending,
    loadForms,
    loadForm,
    createForm,
    updateForm,
    deleteForm,
    loadResponses,
  };
}

