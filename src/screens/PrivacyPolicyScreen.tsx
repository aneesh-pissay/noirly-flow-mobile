import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Card, Screen, Text } from "@noirly-dev/ui-native";
import { config } from "../config";
import { spacing } from "../theme";

/**
 * The same facts as the web policy (noirly-flow `src/lib/legal.ts`). Keep the
 * two in step, and bump `effectiveDate` on both when the substance changes.
 */
const LEGAL = {
  operator: "Aneesh Pissay",
  country: "India",
  effectiveDate: "10 October 2026",
  webHost: "noirly.flow.aneesh-pissay.in",
  androidPackage: "com.noirly.flow",
  identityPrivacyUrl: `${config.identityIssuer}/privacy`,
  deleteAccountUrl: `${config.identityIssuer}/delete-account`,
  contactEmail: "contact@aneesh-pissay.in",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="sectionTitle">{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="copy" tone="secondary">
      {children}
    </Text>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="copy" weight="600">
      {children}
    </Text>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <View style={styles.bullets}>
      {items.map((item, i) => (
        <View key={i} style={styles.bullet}>
          <Text variant="copy" tone="muted">
            •
          </Text>
          <Text variant="copy" tone="secondary" style={styles.bulletText}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function A({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <Text variant="copy" tone="accent" onPress={() => void Linking.openURL(url)} accessibilityRole="link">
      {children}
    </Text>
  );
}

/** Menu → Privacy policy, rendered in the app rather than opened in a browser. */
export function PrivacyPolicyScreen() {
  const mail = `mailto:${LEGAL.contactEmail}`;

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="monoLabel" tone="muted">
          Noirly Flow · Effective {LEGAL.effectiveDate}
        </Text>
        <Text variant="pageTitle">Privacy policy</Text>
      </View>

      <Card variant="flat" style={styles.card}>
        <Text variant="copy">
          This policy covers Noirly Flow on the web ({LEGAL.webHost}) and the Noirly Flow Android app (
          {LEGAL.androidPackage}): what it collects, why, who can see it, how long it is kept and how to delete it. In
          short: Flow stores the work you put in it, shows it only to you and the people you share a workspace with, never
          sells it, and has no ads or trackers.
        </Text>
      </Card>

      <Section title="Who we are">
        <P>
          Noirly Flow is run by {LEGAL.operator}, based in {LEGAL.country}, who is responsible for the data Flow holds
          (“we”, “us”).
        </P>
        <P>
          You sign in to Flow with a <B>Noirly account</B>, which is provided by Noirly Identity. Your account itself
          (email, name, password, Google sign-in and sign-in records) is covered by the{" "}
          <A url={LEGAL.identityPrivacyUrl}>Noirly Identity privacy policy</A>. This policy covers what Flow itself keeps.
        </P>
      </Section>

      <Section title="What Flow collects">
        <Bullets
          items={[
            <>
              <B>Your profile in Flow:</B> the name, email address and picture Noirly Identity shares with Flow when you
              sign in, and anything you add to your Flow profile (display name, title, timezone, bio).
            </>,
            <>
              <B>Your work:</B> workspaces, projects, board columns, tasks (titles, descriptions, status, priority, start
              and due dates, repeats, checklists, subtasks, tags, assignees), and comments.
            </>,
            <>
              <B>Team information:</B> workspace memberships and roles, and invite links you create.
            </>,
            <>
              <B>Activity history:</B> a record of changes in each workspace (who created, edited, completed or commented
              on what, and when), which members of that workspace can see and export.
            </>,
            <>
              <B>Presence:</B> while you have a project open, other members can see that you are online and viewing it.
              This is not stored after you leave.
            </>,
          ]}
        />
        <P>
          <B>Flow does not collect</B> your location, contacts, photos or files from your device, advertising IDs, or
          usage analytics. The Android app asks only for internet access and contains no advertising, analytics or
          crash-reporting SDKs.
        </P>
      </Section>

      <Section title="How we use it">
        <Bullets
          items={[
            "To provide Flow: store your work, keep it in sync across the web and your devices, and show it to you.",
            "To share a workspace’s content with its members, and to show live updates and presence.",
            "To keep the service secure and working, for example by checking that requests come from a signed-in member.",
          ]}
        />
        <P>We do not sell your data, use it for advertising, or build profiles of you.</P>
      </Section>

      <Section title="Who can see it, and who we share it with">
        <Bullets
          items={[
            <>
              <B>You:</B> your personal workspace is visible only to you.
            </>,
            <>
              <B>Members of your team workspaces</B> see that workspace’s projects, tasks, comments and activity, and your
              name and picture. Viewers can read but not change things.
            </>,
            <>
              <B>Noirly Identity</B> signs you in. Flow asks it only to confirm who you are.
            </>,
            <>
              <B>Service providers</B> that host Flow’s servers, database and live-update service for us and process data
              only on our instructions.
            </>,
            <>
              <B>Authorities</B>, only if the law requires it.
            </>,
          ]}
        />
        <P>We do not share your data with anyone else.</P>
      </Section>

      <Section title="On your device">
        <P>
          On the web, Flow uses strictly necessary cookies to keep you signed in and protect sign-in (session and security
          cookies), and remembers your theme in your browser. The Android app keeps its sign-in tokens in Android’s
          encrypted keystore and remembers the last workspace and project you opened. Both are removed when you sign out
          or uninstall the app.
        </P>
      </Section>

      <Section title="Security">
        <P>
          All traffic between your device and Flow is encrypted (HTTPS and secure WebSockets). Every request is checked
          against your Noirly sign-in and your role in the workspace before data is returned or changed.
        </P>
      </Section>

      <Section title="How long we keep it">
        <Bullets
          items={[
            "Your profile and work: for as long as you have a Noirly account, or until you delete them.",
            "Tasks you delete are hidden straight away and kept only as part of the workspace’s history.",
            "When your account is deleted, Flow deletes your data straight away (see below). Copies in our hosting provider’s backups are overwritten on their normal backup cycle.",
          ]}
        />
      </Section>

      <Section title="Deleting your data">
        <P>You can delete your account and your Flow data at any time:</P>
        <Bullets
          items={[
            <>
              <B>In the Android app:</B> Menu → Delete account.
            </>,
            <>
              <B>On the web:</B>{" "}
              <A url={LEGAL.deleteAccountUrl}>{LEGAL.deleteAccountUrl.replace("https://", "")}</A>.
            </>,
          ]}
        />
        <P>
          This deletes your Flow profile, your personal workspace, team workspaces where you are the only member, and your
          comments, activity and invites. In team workspaces shared with others, tasks you created stay with the team
          (they belong to the workspace) but are no longer linked to you, and if you owned the workspace, ownership passes
          to another member. This cannot be undone.
        </P>
      </Section>

      <Section title="Your choices and rights">
        <P>
          You can see and change your work and Flow profile in the app, export a workspace’s activity as CSV, and delete
          your account as described above. Depending on where you live (including under India’s Digital Personal Data
          Protection Act, 2023), you may also have the right to request a copy of your data, to have it corrected or
          erased, and to complain to a data protection authority. To make a request, email{" "}
          <A url={mail}>{LEGAL.contactEmail}</A>.
        </P>
      </Section>

      <Section title="Children">
        <P>
          Noirly Flow is not meant for children under 13, and we do not knowingly collect their data. If you believe a
          child is using Flow, contact us and we will delete their data.
        </P>
      </Section>

      <Section title="Changes to this policy">
        <P>
          If we change this policy, we will update the date at the top of this page. For significant changes we will tell
          you in the app or by email before they take effect.
        </P>
      </Section>

      <Section title="Contact">
        <P>
          Questions about privacy in Noirly Flow? Email <A url={mail}>{LEGAL.contactEmail}</A>. For your Noirly account
          itself, see the <A url={LEGAL.identityPrivacyUrl}>Noirly Identity privacy policy</A>.
        </P>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xl * 2 },
  header: { gap: spacing.sm },
  card: { padding: spacing.lg },
  section: { gap: spacing.sm },
  bullets: { gap: spacing.sm },
  bullet: { flexDirection: "row", gap: spacing.sm },
  bulletText: { flex: 1 },
});
