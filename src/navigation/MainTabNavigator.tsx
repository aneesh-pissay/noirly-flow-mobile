import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navigationScreenOptions, useTheme } from "@noirly-dev/ui-native";
import { colors, type as typeScale } from "../theme";
import { InboxScreen } from "../screens/InboxScreen";
import { BoardScreen } from "../screens/BoardScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ProjectScreen } from "../screens/ProjectScreen";
import { TaskScreen } from "../screens/TaskScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { DeleteAccountScreen } from "../screens/DeleteAccountScreen";
import { ActivityScreen } from "../screens/ActivityScreen";
import { MembersScreen } from "../screens/MembersScreen";
import { WorkspaceScreen } from "../screens/WorkspaceScreen";
import { TabIcon } from "./TabIcon";
import type {
  BoardStackParamList,
  InboxStackParamList,
  MainTabParamList,
  MenuStackParamList,
  SearchStackParamList,
} from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();
const InboxStack = createNativeStackNavigator<InboxStackParamList>();
const BoardStack = createNativeStackNavigator<BoardStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const MenuStack = createNativeStackNavigator<MenuStackParamList>();

/**
 * Each stack reads screen options from the theme rather than from a module
 * constant. The old `stackScreenOptions` was evaluated once at import time, so
 * it could never follow a palette change.
 */
function useStackScreenOptions() {
  const tokens = useTheme();
  return navigationScreenOptions(tokens);
}

function InboxStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <InboxStack.Navigator screenOptions={screenOptions}>
      <InboxStack.Screen
        name="InboxHome"
        component={InboxScreen}
        options={{ title: "Inbox", headerShown: false }}
      />
      <InboxStack.Screen
        name="Task"
        component={TaskScreen}
        options={{ title: "Task" }}
      />
    </InboxStack.Navigator>
  );
}

function BoardStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <BoardStack.Navigator screenOptions={screenOptions}>
      <BoardStack.Screen
        name="BoardHome"
        component={BoardScreen}
        options={{ title: "Board", headerShown: false }}
      />
      <BoardStack.Screen
        name="Project"
        component={ProjectScreen}
        options={({ route }) => ({ title: route.params.projectName })}
      />
      <BoardStack.Screen
        name="Task"
        component={TaskScreen}
        options={{ title: "Task" }}
      />
    </BoardStack.Navigator>
  );
}

function SearchStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <SearchStack.Navigator screenOptions={screenOptions}>
      <SearchStack.Screen
        name="SearchHome"
        component={SearchScreen}
        options={{ title: "Search", headerShown: false }}
      />
      <SearchStack.Screen
        name="Task"
        component={TaskScreen}
        options={{ title: "Task" }}
      />
      <SearchStack.Screen
        name="Workspace"
        component={WorkspaceScreen}
        options={({ route }) => ({ title: route.params.workspaceName })}
      />
      <SearchStack.Screen
        name="Project"
        component={ProjectScreen}
        options={({ route }) => ({ title: route.params.projectName })}
      />
    </SearchStack.Navigator>
  );
}

function MenuStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <MenuStack.Navigator screenOptions={screenOptions}>
      <MenuStack.Screen
        name="MenuHome"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <MenuStack.Screen name="Settings" component={SettingsScreen} />
      <MenuStack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{ title: "Delete account" }}
      />
      <MenuStack.Screen name="Activity" component={ActivityScreen} />
      <MenuStack.Screen name="Members" component={MembersScreen} />
      <MenuStack.Screen
        name="Workspace"
        component={WorkspaceScreen}
        options={({ route }) => ({ title: route.params.workspaceName })}
      />
      <MenuStack.Screen
        name="Project"
        component={ProjectScreen}
        options={({ route }) => ({ title: route.params.projectName })}
      />
      <MenuStack.Screen
        name="Task"
        component={TaskScreen}
        options={{ title: "Task" }}
      />
    </MenuStack.Navigator>
  );
}

function TabItem({
  name,
  label,
  focused,
}: {
  name: "inbox" | "board" | "search" | "menu";
  label: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabItem}>
      <TabIcon name={name} focused={focused} />
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        allowFontScaling={false}
      >
        {label}
      </Text>
      {/* A 2px accent rule marks the current tab, the same signal the web
          sidebar uses for its active row. */}
      <View style={[styles.tabMark, focused && styles.tabMarkActive]} />
    </View>
  );
}

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        // The custom tab item draws its own label under the icon. React
        // Navigation's default icon slot is ~30px wide, which ellipsizes
        // "Inbox" / "Board" / "Search" into "Inb…" — stretch the slot so the
        // full word fits.
        tabBarIconStyle: styles.tabBarIcon,
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: [
          styles.tabBar,
          { height: 58 + bottomPad, paddingBottom: bottomPad },
        ],
        tabBarBackground: () => (
          <View pointerEvents="none" style={styles.tabBarBg} />
        ),
      }}
    >
      <Tab.Screen
        name="InboxTab"
        component={InboxStackNavigator}
        options={{
          title: "Inbox",
          tabBarButtonTestID: "tab-inbox",
          tabBarIcon: ({ focused }) => (
            <TabItem name="inbox" label="Inbox" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="BoardTab"
        component={BoardStackNavigator}
        options={{
          title: "Board",
          tabBarButtonTestID: "tab-board",
          tabBarIcon: ({ focused }) => (
            <TabItem name="board" label="Board" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStackNavigator}
        options={{
          title: "Search",
          tabBarButtonTestID: "tab-search",
          tabBarIcon: ({ focused }) => (
            <TabItem name="search" label="Search" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="MenuTab"
        component={MenuStackNavigator}
        options={{
          title: "Menu",
          tabBarButtonTestID: "tab-menu",
          tabBarIcon: ({ focused }) => (
            <TabItem name="menu" label="Menu" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    paddingTop: 0,
  },
  tabBarBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tabBarItem: {
    flex: 1,
  },
  tabBarIcon: {
    width: "100%",
    height: 46,
  },
  tabItem: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  tabLabel: {
    fontFamily: typeScale.monoLabel.fontFamily,
    fontSize: typeScale.monoLabel.fontSize,
    lineHeight: typeScale.monoLabel.lineHeight,
    // monoLabel's 1.8 letter-spacing is meant for sparse section tags; at tab
    // width it forces "Inbox" into "Inb…". Keep the mono face, drop the tracking.
    letterSpacing: 0.4,
    color: colors.textMuted,
    textAlign: "center",
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  tabLabelActive: {
    color: colors.accent,
  },
  tabMark: {
    height: 2,
    width: 16,
    borderRadius: 1,
    marginTop: 2,
    backgroundColor: "transparent",
  },
  tabMarkActive: {
    backgroundColor: colors.accent,
  },
});
