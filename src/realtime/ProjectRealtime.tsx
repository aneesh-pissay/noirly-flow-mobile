import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { RealtimeClient, type ClientStatus } from "@noirly-dev/realtime-client";
import type { EventPayload, PresenceMember } from "@noirly-dev/realtime-shared";
import { Text, useTheme } from "@noirly-dev/ui-native";
import { api } from "../api/client";
import { config } from "../config";

type Options = {
  workspaceId: string;
  projectId?: string | null;
  enabled?: boolean;
  /** Join presence on the project channel (the board does; the task screen doesn't). */
  presence?: boolean;
  /** Shown to other viewers in their presence avatars. */
  presenceName?: string | null;
  onEvent?: (event: string, data: unknown) => void;
};

/**
 * Connects to noirly-realtime for live task/comment updates — native
 * WebSocket only, no WebView. Mirrors the web `ProjectRealtime`: subscribes to
 * the workspace channel and, when given a project, to `project:{id}` with
 * presence, reporting connection status so callers can slow their polling
 * once the socket is live.
 */
export function useProjectRealtime({
  workspaceId,
  projectId,
  enabled = true,
  presence = true,
  presenceName,
  onEvent,
}: Options) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const [status, setStatus] = useState<ClientStatus>("idle");
  const [members, setMembers] = useState<PresenceMember[]>([]);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    let cancelled = false;
    let client: RealtimeClient | null = null;
    const unsubs: Array<() => void> = [];
    const channel = projectId ? `project:${projectId}` : null;

    void (async () => {
      try {
        const first = await api.realtimeToken(workspaceId, projectId ?? undefined);
        const wsUrl = first.url || config.realtimeWsUrl;
        if (!wsUrl || cancelled) return;

        // The first token is used once; reconnects mint a fresh one so a
        // socket that drops after the token expires can still come back.
        let pending: string | null = first.token;
        client = new RealtimeClient({
          url: wsUrl,
          getToken: async () => {
            if (pending) {
              const token = pending;
              pending = null;
              return token;
            }
            const next = await api.realtimeToken(
              workspaceId,
              projectId ?? undefined,
            );
            return next.token;
          },
        });
        const live = client;
        unsubs.push(live.onStatus((next) => !cancelled && setStatus(next)));
        unsubs.push(
          live.on("event", (msg) => {
            const payload = msg.payload as EventPayload | undefined;
            if (payload?.event) onEventRef.current?.(payload.event, payload.data);
          }),
        );
        if (channel) {
          unsubs.push(
            live.presenceStore.onChange((changed) => {
              if (changed === channel && !cancelled) {
                setMembers(live.presenceStore.list(channel, true));
              }
            }),
          );
        }

        await live.connect();
        if (cancelled) return;

        const workspaceSub = await live.subscribe(`workspace:${workspaceId}`);
        unsubs.push(() => void workspaceSub.unsubscribe());

        if (channel) {
          const projectSub = await live.subscribe(channel, { presence });
          unsubs.push(() => void projectSub.unsubscribe());
          if (presence) {
            try {
              await projectSub.presence.join({
                kind: "viewer",
                ...(presenceName ? { name: presenceName } : {}),
              });
            } catch {
              // presence optional
            }
          }
        }
      } catch {
        // Realtime optional — screens still poll and refresh on focus.
      }
    })();

    return () => {
      cancelled = true;
      for (const off of unsubs) off();
      client?.disconnect();
      setStatus("idle");
      setMembers([]);
    };
  }, [enabled, projectId, workspaceId, presence, presenceName]);

  return { status, members };
}

/** Live dot plus up to five viewer initials and a `+N`, like the web header. */
export function PresenceAvatars({
  members,
  status,
}: {
  members: PresenceMember[];
  status: ClientStatus;
}) {
  const tokens = useTheme();
  const shown = members.slice(0, 5);
  const extra = members.length - shown.length;
  const live = status === "ready";

  return (
    <View
      style={styles.row}
      accessibilityLabel={`${live ? "Live" : status}. ${members.length} viewing`}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: live ? tokens.color.accent : tokens.color.textMuted },
        ]}
      />
      <Text variant="monoLabel" tone="muted">
        {live ? "Live" : status === "idle" ? "Offline" : status}
      </Text>
      <View style={styles.stack}>
        {shown.map((member, index) => {
          const name =
            typeof member.data.name === "string" && member.data.name.length > 0
              ? member.data.name
              : member.userId;
          return (
            <View
              key={member.clientId}
              style={[
                styles.avatar,
                {
                  marginLeft: index === 0 ? 0 : -6,
                  backgroundColor: tokens.color.surface2,
                  borderColor: tokens.color.bg,
                },
              ]}
            >
              <Text variant="meta" style={styles.initial}>
                {name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          );
        })}
      </View>
      {extra > 0 ? (
        <Text variant="monoLabel" tone="muted">
          +{extra}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  stack: { flexDirection: "row", marginLeft: 4 },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontSize: 11, lineHeight: 13 },
});
