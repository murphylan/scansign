"use client";

import { useEffect } from "react";

import { touchPresenceAction } from "@/server/actions/authAction";

const INTERVAL_MS = 60_000;

export function PresenceBeacon() {
  useEffect(() => {
    const tick = () => {
      void touchPresenceAction();
    };
    tick();
    const id = window.setInterval(tick, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
