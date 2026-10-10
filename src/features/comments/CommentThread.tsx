import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Input, Separator, Text } from "@noirly-dev/ui-native";
import { api } from "../../api/client";
import { spacing } from "../../theme";
import type { Comment } from "../../types";
import { memberName, type WorkspaceMember } from "../workspace/members";

type Props = {
  taskId: string;
  members: WorkspaceMember[];
  writable: boolean;
  /** Current user id, for labelling an optimistic comment before it saves. */
  meId?: string;
  /** Bump to refetch (live `comment.created`, screen refocus). */
  refreshKey?: number;
};

export function CommentThread({ taskId, members, writable, meId, refreshKey = 0 }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { comments: list } = await api.listComments(taskId);
      setComments(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    const now = new Date().toISOString();
    const optimistic: Comment = {
      id: `tmp-${Date.now()}`,
      taskId,
      authorId: meId ?? "",
      body: text,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    setComments((list) => [...list, optimistic]);
    setBody("");
    setError(null);
    try {
      const { comment } = await api.createComment(taskId, text);
      setComments((list) =>
        list.map((item) => (item.id === optimistic.id ? comment : item)),
      );
    } catch (err) {
      setComments((list) => list.filter((item) => item.id !== optimistic.id));
      setBody(text);
      setError(err instanceof Error ? err.message : "Send failed");
    }
  }

  return (
    <View style={styles.root}>
      <Text variant="monoLabel" tone="muted">
        {comments.length === 0 ? "Comments" : `Comments · ${comments.length}`}
      </Text>

      {/* Mapped rather than a FlatList: this sits inside the task ScrollView. */}
      {comments.length > 0 ? (
        <Card variant="flat">
          {comments.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <Separator /> : null}
              <View style={styles.comment}>
                <View style={styles.head}>
                  <Text variant="label" weight="600" style={styles.author}>
                    {memberName(members, item.authorId)}
                  </Text>
                  <Text variant="meta" tone="muted">
                    {item.id.startsWith("tmp-")
                      ? "Sending…"
                      : new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
                <Text variant="body" tone="secondary">
                  {item.body}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <Text variant="copy" tone="muted">
          {loading ? "Loading comments…" : "No comments yet."}
        </Text>
      )}

      {writable ? (
        <View style={styles.composer}>
          <Input
            testID="comment-input"
            placeholder="Write a comment…"
            value={body}
            onChangeText={setBody}
            multiline
            inputStyle={styles.composerInput}
          />
          <Button
            testID="comment-submit"
            label="Comment"
            size="sm"
            disabled={!body.trim()}
            onPress={() => void send()}
            style={styles.send}
          />
        </View>
      ) : null}
      {error ? (
        <Text variant="meta" tone="destructive">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  comment: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
  },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  author: { flexShrink: 1 },
  composer: { gap: spacing.sm },
  composerInput: { minHeight: 72, textAlignVertical: "top" },
  send: { alignSelf: "flex-end" },
});
