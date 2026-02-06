import { useRouter } from "expo-router";
import { Activity, Menu } from "lucide-react-native";
import React, { useState } from "react";
import { Linking, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";


function RNButton({
  children,
  variant = "solid",
  size = "md",
  onPress,
  full,
}: {
  children: React.ReactNode;
  variant?: "solid" | "outline" | "ghost";
  size?: "md" | "lg" | "icon";
  onPress?: () => void;
  full?: boolean;
}) {
  const padY = size === "lg" ? 14 : 10;
  const padX = size === "icon" ? 10 : size === "lg" ? 18 : 14;
  const radius = 12;
  const bg =
    variant === "solid" ? "#f97316" : variant === "outline" ? "transparent" : "transparent";
  const borderColor = variant === "outline" ? "#e5e7eb" : "transparent";
  const textColor = variant === "solid" ? "#fff" : "#111827";

  return (
    <Pressable
      onPress={onPress}
      style={{
        alignSelf: full ? "stretch" : "flex-start",
        paddingVertical: padY,
        paddingHorizontal: padX,
        borderRadius: radius,
        backgroundColor: bg,
        borderWidth: variant === "outline" ? 1 : 0,
        borderColor,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        minWidth: size === "icon" ? 44 : undefined,
        minHeight: size === "icon" ? 44 : undefined,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontWeight: "600",
          fontSize: size === "lg" ? 16 : 14,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

/* ------------------------------- page ------------------------------- */

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const LinkText = ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <Pressable onPress={() => Linking.openURL(href)} style={{ padding: 6 }}>
      <Text style={{ color: "#4b5563", fontSize: 14 }}>{children}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Platform.select({ ios: 50, android: 30, default: 16 }),
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
          backgroundColor: "rgba(255,255,255,0.95)",
        }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Activity size={26} color="#f97316" />
            <Text style={{ fontSize: 18, fontWeight: "600" }}>PACER</Text>
          </View>

          {/* Right side actions  */}
          <Pressable onPress={() => setMobileMenuOpen(true)} style={{ padding: 8 }}>
            <Menu size={24} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 }}>

          <Text
            style={{
              fontSize: 28,
              lineHeight: 34,
              fontWeight: "800",
              marginBottom: 10,
              color: "#111827",
            }}
          >
            Gain Insight For a Better Run
          </Text>
          </View>

        {/* CTA */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 8, textAlign: "center" }}>
            Ready to Start?
          </Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <RNButton size="lg" full onPress={() => router.push("/signup")}>
              Sign Up Free
            </RNButton>

            <RNButton size="lg" variant="outline">
              Learn More
            </RNButton>
          </View>

          <Text style={{ marginTop: 12, color: "#6b7280", fontSize: 12, textAlign: "center" }}>
            Free to join. Available on iOS.
          </Text>
        </View>

        {/* Footer */}
        <View style={{ backgroundColor: "#111827", paddingHorizontal: 16, paddingVertical: 24 }}>
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Activity size={22} color="#f97316" />
              <Text style={{ color: "white", fontWeight: "600" }}>PACER</Text>
            </View>
            <Text style={{ color: "#d1d5db", fontSize: 12 }}>
              Track your runs, get predictions and achieve your goals.
            </Text>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: "#1f2937",
              marginVertical: 16,
            }}
          />
          <Text style={{ color: "#9ca3af", fontSize: 12, textAlign: "center" }}>
            2025 PACER.
          </Text>
        </View>
      </ScrollView>

      {/* Mobile menu */}
      <Modal
        visible={mobileMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMobileMenuOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            onPress={() => setMobileMenuOpen(false)}
            style={{ position: "absolute", inset: 0 as any, backgroundColor: "rgba(0,0,0,0.4)" }}
          />
          <View
            style={{
              backgroundColor: "#fff",
              padding: 16,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>Menu</Text>

            <View style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 12 }} />

            <RNButton full variant="outline" onPress={() => router.push("/login")}>
              Log In
            </RNButton>
            <View style={{ height: 8 }} />
            <RNButton full onPress={() => router.push("/signup")}>
              Sign Up Free
            </RNButton>
          </View>
        </View>
      </Modal>
    </View>
  );
}
