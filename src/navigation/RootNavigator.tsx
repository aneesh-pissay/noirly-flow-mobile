import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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
import { InviteScreen } from "../screens/InviteScreen";
import { MainTabNavigator } from "./MainTabNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ["noirlyflow://"],
  config: {
    screens: {
      Invite: "invite/:token",
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

  // Hold the spinner until the last-used workspace is restored, so the first
  // tab doesn't open on the personal workspace and then jump.
  if (loading || (session && !workspaceReady)) {
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
        {!session ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
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
