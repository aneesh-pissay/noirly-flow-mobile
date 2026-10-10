import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "@noirly-dev/ui-native";
import { api } from "../../api/client";
import { spacing } from "../../theme";
import type { ActivityEvent } from "../../types";
import type { WorkspaceMember } from "../workspace/members";
import { describeActivity } from "./format";

type Props = {
  workspaceId: string;
  taskId?: string;
  members: WorkspaceMember[];
  /** Bump to refetch from the first page (pull-to-refresh, live events). */
  refreshKey?: number;
  showLabel?: boolean;
};

/**
 * Cursor-paginated activity with "Load more", like the web `ActivityFeed`.
 * Rendered as plain views so it can sit inside a parent ScrollView.
 */
export function ActivityFeed({
  workspaceId,
  taskId,
  members,
  refreshKey = 0,
  showLabel = true,
}: Props) {
  const [items, setItems] = useState<ActivityEvent[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirst = useCallback(async () => {
    try {
      const page = await api.listActivity(workspaceId, { taskId });
      setItems(page.items);
      setCursor(page.nextCursor);
      setError(null);
    } catch {
      setError("Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, taskId]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst, refreshKey]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await api.listActivity(workspaceId, { taskId, cursor });
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
      setError(null);
    } catch {
      setError("Could not load more activity.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <View style={styles.root}>
      {showLabel ? (
        <Text variant="monoLabel" tone="muted">
          Activity
        </Text>
      ) : null}
      {loading ? (
        <Text variant="meta" tone="muted">
          Loading activity…
        </Text>
      ) : items.length === 0 && !error ? (
        <Text variant="meta" tone="muted">
          No activity yet.
        </Text>
      ) : (
        items.map((event) => (
          <View key={event.id} style={styles.item}>
            <Text variant="copy" tone="secondary">
              {describeActivity(event, members)}
            </Text>
            <Text variant="meta" tone="muted">
              {new Date(event.createdAt).toLocaleString()}
            </Text>
          </View>
        ))
      )}
      {error ? (
        <Text variant="meta" tone="destructive">
          {error}
        </Text>
      ) : null}
      {cursor ? (
        <Button
          label={loadingMore ? "Loading…" : error ? "Try again" : "Load more"}
          size="sm"
          variant="ghost"
          loading={loadingMore}
          onPress={() => void loadMore()}
          style={styles.more}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  item: { gap: 2 },
  more: { alignSelf: "flex-start" },
});
