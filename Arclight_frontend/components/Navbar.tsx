import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { PanelLeft } from "lucide-react-native";
import { useSidebar } from "../context/SideBarContext";   // <-- ADD THIS

interface NavbarProps {
  screenName: string;
}

// Logo component same as before...
const LogoIcon = ({ size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 707.9 631.64" fill="none">
    <G>
      <Path
        d="M856.46,719.56,722.79,488,558.61,772.39a12.25,12.25,0,0,1-.78,1.36l0,.07h0a14.85,14.85,0,0,1-5,4.65l-79.9,46.13H795.82C849.73,824.6,883.42,766.24,856.46,719.56Z"
        transform="translate(-158.05 -192.95)"
        fill="black"
      />
      <Path
        d="M427.8,706.3a14.71,14.71,0,0,1,1.54-6.63h0l0,0a13.16,13.16,0,0,1,.84-1.46l207-358.46L572.64,228c-26.95-46.69-94.33-46.69-121.28,0L167.54,719.56c-27,46.68,6.73,105,60.64,105H427.8Z"
        transform="translate(-158.05 -192.95)"
        fill="black"
      />
    </G>
  </Svg>
);

const Navbar: React.FC<NavbarProps> = ({ screenName }) => {
  const { toggleSidebar } = useSidebar();   // <-- USE SIDEBAR CONTEXT

  return (
    <View
      style={{
        width: "100%",
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* LEFT: Sidebar Button */}
      <TouchableOpacity
        onPress={toggleSidebar}   // <-- OPEN SIDEBAR
        style={{
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PanelLeft size={28} strokeWidth={2.5} color="black" />
      </TouchableOpacity>

      {/* CENTER: Title */}
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text
          style={{
            fontFamily: "geistmono",
            fontSize: 16,
            color: "black",
          }}
        >
          {screenName}
        </Text>
      </View>

      {/* RIGHT: Logo */}
      <View
        style={{
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LogoIcon size={28} />
      </View>
    </View>
  );
};

export default Navbar;
