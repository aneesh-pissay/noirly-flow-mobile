import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { FlowMe } from "../types";

let cached: FlowMe | null = null;
let inflight: Promise<FlowMe | null> | null = null;
const listeners = new Set<(me: FlowMe | null) => void>();

function fetchMe(): Promise<FlowMe | null> {
  if (!inflight) {
    inflight = api
      .me()
      .then(({ user }) => {
        setMe(user);
        return user;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Shares one `/api/me` result across screens; Settings writes back through `setMe`. */
export function setMe(me: FlowMe | null) {
  cached = me;
  for (const listener of listeners) listener(me);
}

export function useMe(): FlowMe | null {
  const [me, setLocal] = useState<FlowMe | null>(cached);
  useEffect(() => {
    listeners.add(setLocal);
    if (!cached) void fetchMe();
    return () => {
      listeners.delete(setLocal);
    };
  }, []);
  return me;
}

export function meName(me: FlowMe | null): string | null {
  if (!me) return null;
  return me.profile.displayName ?? me.displayName ?? me.identityName ?? null;
}
