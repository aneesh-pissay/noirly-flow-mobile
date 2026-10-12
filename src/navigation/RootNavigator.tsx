import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { getPreference, setPreference } from "noirly-flow-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  navigationScreenOptions,
  navigationTheme,
  useTheme,
} from "@noirly-dev/ui-native";
import { useAuth } from "../auth/AuthContext";
import { useWorkspace } from "../workspace/WorkspaceContext";
import type { RootStackParamList } from "./types";
import { LoginScreen } from "../screens/LoginScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";
import { VerifyEmailScreen } from "../screens/auth/VerifyEmailScreen";
import { InviteScreen } from "../screens/InviteScreen";
import { MainTabNavigator } from "./MainTabNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();

const ONBOARDED_KEY = "flow.onboarded";

/** `null` while the stored flag is being read. */
function useOnboarded() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useEffect(() => {
    getPreference(ONBOARDED_KEY)
      .then((value) => setOnboarded(value === "1"))
      .catch(() => setOnboarded(true));
  }, []);
  const finish = useCallback(() => {
    setPreference(ONBOARDED_KEY, "1");
    setOnboarded(true);
  }, []);
  return [onboarded, finish] as const;
}

const linking = {
  prefixes: ["noirlyflow://"],
  config: {
    screens: {
      Invite: "invite/:token",
      // noirlyflow://reset-password?token=… — the query becomes the param.
      ResetPassword: "reset-password",
      Main: {
        path: "",
        screens: {
          InboxTab: "inbox",
          BoardTab: "board",
          SearchTab: "search",
          MenuTab: "menu",
        },
      },
    },
  },
};

export function RootNavigator() {
  const { session, loading } = useAuth();
  const { ready: workspaceReady } = useWorkspace();
  const tokens = useTheme();
  const [onboarded, finishOnboarding] = useOnboarded();

  // Hold the spinner until the last-used workspace is restored, so the first
  // tab doesn't open on the personal workspace and then jump.
  if (loading || onboarded === null || (session && !workspaceReady)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tokens.color.bg,
        }}
      >
        <ActivityIndicator color={tokens.color.accent} />
      </View>
    );
  }

  return (
    // Theming the container as well as the screens matters for the frame you
    // see *between* screens: without it React Navigation paints its own default
    // background during a push, which flashes light on a dark app.
    <NavigationContainer linking={linking} theme={navigationTheme(tokens)}>
      <Stack.Navigator screenOptions={navigationScreenOptions(tokens)}>
        {!session && !onboarded ? (
          <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
            {() => <OnboardingScreen onDone={finishOnboarding} />}
          </Stack.Screen>
        ) : !session ? (
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </Stack.Group>
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Invite"
              component={InviteScreen}
              options={{ title: "Invite" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
