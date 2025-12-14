import { create } from "zustand";
import type { LoginSession, UserInfo, SessionStatus } from "@/types";

interface LoginState {
  // 当前会话
  session: LoginSession | null;
  // 是否正在加载
  isLoading: boolean;
  // 错误信息
  error: string | null;
  // 轮询间隔ID
  pollingId: NodeJS.Timeout | null;

  // Actions
  setSession: (session: LoginSession | null) => void;
  updateStatus: (status: SessionStatus, userInfo?: UserInfo) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPollingId: (id: NodeJS.Timeout | null) => void;
  reset: () => void;
}

export const useLoginStore = create<LoginState>((set, get) => ({
  session: null,
  isLoading: false,
  error: null,
  pollingId: null,

  setSession: (session) => set({ session, error: null }),

  updateStatus: (status, userInfo) =>
    set((state) => ({
      session: state.session
        ? { ...state.session, status, userInfo: userInfo ?? state.session.userInfo }
        : null,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setPollingId: (pollingId) => {
    const current = get().pollingId;
    if (current) {
      clearInterval(current);
    }
    set({ pollingId });
  },

  reset: () => {
    const current = get().pollingId;
    if (current) {
      clearInterval(current);
    }
    set({
      session: null,
      isLoading: false,
      error: null,
      pollingId: null,
    });
  },
}));

