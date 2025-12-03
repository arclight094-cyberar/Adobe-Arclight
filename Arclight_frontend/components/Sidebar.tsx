import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  PanResponder,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import { Crown } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useSidebar } from "../context/SideBarContext";
import { useTheme } from "../context/ThemeContext";
import apiService from "../services/api";

// Smooth gesture settings (from your old working version)
const SIDEBAR_WIDTH = 288;
const EDGE_SWIPE_WIDTH = 24;
const SWIPE_THRESHOLD = 45;

export default function Sidebar() {
  const router = useRouter();
  const { isOpen, openSidebar, closeSidebar } = useSidebar();
  const { isDark, toggleTheme, colors } = useTheme();

  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: isOpen ? 0 : -SIDEBAR_WIDTH,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  }, [isOpen]);

  // Swipe to CLOSE
  const sidebarPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isOpen,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) translateX.setValue(Math.max(-SIDEBAR_WIDTH, g.dx));
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -SWIPE_THRESHOLD) closeSidebar();
      else Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
  });

  // Swipe to OPEN
  const edgePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: (_, g) => !isOpen && g.x0 < EDGE_SWIPE_WIDTH,
    onPanResponderMove: (_, g) => {
      if (g.dx > 0)
        translateX.setValue(Math.min(0, -SIDEBAR_WIDTH + g.dx));
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD) openSidebar();
      else Animated.spring(translateX, {
        toValue: -SIDEBAR_WIDTH,
        useNativeDriver: true,
      }).start();
    },
  });

  const menuItems = [
    { icon: "home", label: "HOME", path: "/(app)/home" },
    { icon: "user", label: "PROFILE", path: "/(app)/profile" },
    { icon: "folder", label: "PROJECTS", path: "/(app)/projects" },
    { icon: "help-circle", label: "TUTORIALS", path: "/(app)/tutorials" },
    { icon: "settings", label: "SETTINGS", path: "/(app)/settings" },
  ];

  const navigate = (path: string) => {
    closeSidebar();
    setTimeout(() => router.push(path), 200);
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear all stored data
              await apiService.logout();
              await AsyncStorage.removeItem('pending_password');
              
              // Close sidebar
              closeSidebar();
              
              // Navigate to login screen
              router.replace('/(auth)/signup');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      {/* Edge swipe area */}
      {!isOpen && (
        <Animated.View
          {...edgePanResponder.panHandlers}
          style={styles.edgeCatcher}
        />
      )}

      {/* OVERLAY */}
      {isOpen && (
        <TouchableWithoutFeedback onPress={closeSidebar}>
          <View style={[styles.overlay, { backgroundColor: colors.background.overlay }]} />
        </TouchableWithoutFeedback>
      )}

      {/* SIDEBAR */}
      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX }], backgroundColor: colors.background.primary }]}
        {...sidebarPanResponder.panHandlers}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                <Image
                  source={{
                    uri:
                      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100",
                  }}
                  style={styles.profileImage}
                />
              </View>

              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text.primary }]}>Arclighter</Text>
                <Text style={[styles.profileEmail, { color: colors.text.grayLight }]}>xyz@ijk.com</Text>
              </View>
            </View>

            <Pressable style={styles.closeButton} onPress={closeSidebar}>
              <Feather name="sidebar" size={36} color={colors.text.primary} />
            </Pressable>
          </View>

          {/* MENU */}
          <ScrollView
            style={styles.menuContainer}
            showsVerticalScrollIndicator={false}
          >
            {menuItems.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => navigate(item.path)}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && [styles.menuItemPressed, { backgroundColor: colors.background.buttonHover }],
                ]}
              >
                <Feather name={item.icon as any} size={24} color={colors.text.primary} />
                <Text style={[styles.menuLabel, { color: colors.text.primary }]}>{item.label}</Text>
              </Pressable>
            ))}

            {/* PREMIUM */}
            <Pressable style={styles.menuItem}>
              <Crown size={24} color={colors.special.premium} strokeWidth={2.5} />
              <Text style={[styles.menuLabel, { color: colors.special.premium }]}>
                PREMIUM
              </Text>
            </Pressable>

            {/* LOGOUT */}
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.menuItem,
                [styles.logoutItem, { borderTopColor: colors.border.light }],
                pressed && [styles.menuItemPressed, { backgroundColor: colors.background.buttonHover }],
              ]}
            >
              <Feather name="log-out" size={24} color={colors.special.logout} />
              <Text style={[styles.menuLabel, { color: colors.special.logout }]}>
                LOGOUT
              </Text>
            </Pressable>

          </ScrollView>

          {/* THEME TOGGLE */}
          <View style={styles.footer}>
            <Feather
              name="sun"
              size={24}
              color={isDark ? colors.special.gray : colors.special.yellow}
            />

            <Pressable
              onPress={toggleTheme}
              style={[
                styles.toggleSwitch,
                { backgroundColor: isDark ? colors.special.grayLight : colors.special.grayDark },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  isDark ? styles.thumbRight : styles.thumbLeft,
                ]}
              />
            </Pressable>

            <Feather
              name="moon"
              size={24}
              color={isDark ? colors.special.blueSky : colors.special.gray}
            />
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  edgeCatcher: {
    position: "absolute",
    left: 0,
    top: 0,
    width: EDGE_SWIPE_WIDTH,
    height: "100%",
    zIndex: 1,
  },
  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 40,
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    borderTopRightRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 10,
    zIndex: 50,
  },
  safeArea: {
    flex: 1,
  },

  /* HEADER */
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  profileSection: {
    flex: 1,
  },
  profileImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    marginBottom: 12,
  },
  profileImage: { width: "100%", height: "100%" },
  profileInfo: { gap: 2 },
  profileName: { fontSize: 20, fontWeight: "bold", fontFamily: "geistmono" },
  profileEmail: { fontSize: 12, fontFamily: "geistmono" },
  closeButton: { padding: 6 },

  /* MENU */
  menuContainer: { flex: 1, paddingTop: 12 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 28,
    gap: 16,
  },
  menuItemPressed: {
  },
  menuLabel: { fontSize: 16, fontWeight: "600", fontFamily: "geistmono" },
  logoutItem: {
    marginTop: 8,
    borderTopWidth: 1,
    paddingTop: 20,
  },

  /* FOOTER */
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },

  toggleSwitch: {
    width: 64,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "white",
  },
  thumbLeft: { marginLeft: 2 },
  thumbRight: { marginLeft: 34 },
});
