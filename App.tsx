/**
 * @format
 */

import React from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NoirlyThemeProvider } from "@noirly-dev/ui-native";
import { AuthProvider } from "./src/auth/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { WorkspaceProvider } from "./src/workspace/WorkspaceContext";

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        {/*
          Pinned to dark rather than following the OS. Every screen in this app
          is styled from the static dark snapshot in `src/theme.ts` (StyleSheet
          cannot call a hook), so letting the provider flip to light would theme
          the navigation chrome without theming the screens inside it.
        */}
        <NoirlyThemeProvider themeId="gold" scheme="dark">
          <AuthProvider>
            <WorkspaceProvider>
              <RootNavigator />
            </WorkspaceProvider>
          </AuthProvider>
        </NoirlyThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
