import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  Button,
  Input,
  ListRow,
  ListSeparator,
  Text,
} from '@noirly-dev/ui-native';
import { api } from '../../api/client';
import { spacing } from '../../theme';
import type { ReportReason } from '../../types';
import { Sheet } from '../../ui/Sheet';

const REASONS: Array<{
  value: ReportReason;
  label: string;
  subtitle?: string;
}> = [
  { value: 'spam', label: 'Spam', subtitle: 'Ads, scams or repeated junk' },
  { value: 'harassment', label: 'Harassment or bullying' },
  {
    value: 'hate',
    label: 'Hate speech',
    subtitle: 'Attacks on people for who they are',
  },
  { value: 'sexual', label: 'Sexual content' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'self_harm', label: 'Self-harm or suicide' },
  { value: 'illegal', label: 'Something illegal' },
  { value: 'other', label: 'Something else' },
];

export type ReportTarget =
  | { type: 'comment'; id: string; label: string }
  | { type: 'task'; id: string; label: string }
  | { type: 'user'; id: string; label: string; workspaceId: string };

/**
 * Report a comment, task or member to the Noirly team: pick a reason, add
 * optional details, send. Reports go to the developers for review, not to
 * the person reported.
 */
export function ReportSheet({
  target,
  onClose,
}: {
  target: ReportTarget | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // A new target starts a fresh report.
    setReason(null);
    setDetails('');
  }, [target?.id]);

  async function send() {
    if (!target || !reason) return;
    setSending(true);
    try {
      await api.report({
        targetType: target.type,
        targetId: target.id,
        workspaceId: target.type === 'user' ? target.workspaceId : undefined,
        reason,
        details: details.trim() || null,
      });
      onClose();
      Alert.alert(
        'Thanks for reporting',
        "The Noirly team will review it. The person you reported isn't told who reported them.",
      );
    } catch (error) {
      Alert.alert(
        'Report not sent',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSending(false);
    }
  }

  const noun = target?.type === 'user' ? 'member' : target?.type ?? '';

  return (
    <Sheet
      visible={Boolean(target)}
      title={target ? `Report ${noun}` : undefined}
      onClose={onClose}
    >
      {target ? (
        <View style={styles.body}>
          <Text variant="meta" tone="muted" numberOfLines={2}>
            {target.label}
          </Text>
          {reason === null ? (
            <View>
              <Text variant="label" weight="600" style={styles.question}>
                What's wrong with it?
              </Text>
              {REASONS.map((option, index) => (
                <View key={option.value}>
                  {index > 0 ? <ListSeparator /> : null}
                  <ListRow
                    title={option.label}
                    subtitle={option.subtitle}
                    onPress={() => setReason(option.value)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.step}>
              <Text variant="label" weight="600">
                {REASONS.find(r => r.value === reason)?.label}
              </Text>
              <Input
                testID="report-details"
                placeholder="Anything else we should know? (optional)"
                value={details}
                onChangeText={setDetails}
                multiline
                maxLength={1000}
                inputStyle={styles.details}
              />
              <Button
                testID="report-submit"
                label="Send report"
                variant="destructive"
                loading={sending}
                onPress={() => void send()}
                fullWidth
              />
              <Button
                label="Back"
                variant="ghost"
                size="sm"
                onPress={() => setReason(null)}
              />
            </View>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },
  question: { marginBottom: spacing.sm },
  step: { gap: spacing.md },
  details: { minHeight: 88, textAlignVertical: 'top' },
});
