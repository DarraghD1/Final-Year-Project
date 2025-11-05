import { Activity, Clock, Heart, MapPin, Menu, TrendingUp, Trophy, Users, } from "lucide-react-native";
import React, { useState } from "react";
import { Image, Linking, Modal, Platform, Pressable, ScrollView, Text, View, } from "react-native";
import { ImageWithFallback as MaybeImageWithFallback } from "../../components/figma/ImageWithFallback";


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

function RNBadge({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#ffedd5",
      }}
    >
      <Text style={{ color: "#c2410c", fontSize: 12, fontWeight: "600" }}>
        {children}
      </Text>
    </View>
  );
}

function RNCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}
function RNCardContent({ children }: { children: React.ReactNode }) {
  return <View style={{ padding: 16 }}>{children}</View>;
}

/* ------------------------------- page ------------------------------- */

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const Img = (props: any) =>
    
    MaybeImageWithFallback ? (
      <MaybeImageWithFallback {...props} />
    ) : (
      <Image {...props} />
    );

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

          {/* Right side actions (mobile) */}
          <Pressable onPress={() => setMobileMenuOpen(true)} style={{ padding: 8 }}>
            <Menu size={24} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Hero Section */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 }}>
          <View style={{ marginBottom: 12 }}>
            <RNBadge>Track. Analyze. Improve.</RNBadge>
          </View>

          <Text
            style={{
              fontSize: 28,
              lineHeight: 34,
              fontWeight: "800",
              marginBottom: 10,
              color: "#111827",
            }}
          >
            The Social Network for Athletes
          </Text>

          <Text style={{ color: "#6b7280", marginBottom: 16 }}>
            Track your runs, connect with a community of millions of runners, and
            get the motivation you need to reach your goals.
          </Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <RNButton onPress={() => {}}>Get Started Free</RNButton>
            <RNButton variant="outline" onPress={() => {}}>
              Download App
            </RNButton>
          </View>

          {/* faint background image */}
          <View style={{ marginTop: 24, borderRadius: 16, overflow: "hidden" }}>
            <Img
              source={{
                uri:
                  "https://images.unsplash.com/photo-1609726866022-1ce719b4727b?q=80&w=1080",
              }}
              resizeMode="cover"
              style={{ width: "100%", height: 180, opacity: 0.1 }}
            />
          </View>

          {/* hero stats */}
          <View
            style={{
              marginTop: 20,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            {[
              ["100M+", "Athletes"],
              ["195", "Countries"],
              ["3B+", "Activities"],
            ].map(([big, small]) => (
              <View key={big} style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>
                  {big}
                </Text>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>{small}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Features grid */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16, backgroundColor: "#f9fafb" }}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 6 }}>
              Everything You Need to Run Better
            </Text>
            <Text style={{ color: "#6b7280", textAlign: "center", maxWidth: 560 }}>
              Get detailed insights into your performance, connect with friends,
              and stay motivated every step of the way.
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {[
              {
                icon: <TrendingUp size={24} color="#f97316" />,
                title: "Advanced Analytics",
                body:
                  "Get detailed metrics on pace, distance, elevation, heart rate, and more to understand your performance.",
              },
              {
                icon: <MapPin size={24} color="#3b82f6" />,
                title: "Route Discovery",
                body:
                  "Explore new running routes, save your favorites, and share them with the community.",
              },
              {
                icon: <Users size={24} color="#22c55e" />,
                title: "Social Connection",
                body:
                  "Follow friends, join clubs, participate in challenges, and celebrate achievements together.",
              },
              {
                icon: <Trophy size={24} color="#a855f7" />,
                title: "Challenges & Goals",
                body:
                  "Set personal goals, compete in challenges, and earn achievements as you progress.",
              },
              {
                icon: <Heart size={24} color="#ef4444" />,
                title: "Health Tracking",
                body:
                  "Monitor heart rate, calories burned, and sync with your favorite fitness devices.",
              },
              {
                icon: <Clock size={24} color="#ca8a04" />,
                title: "Training Plans",
                body:
                  "Access personalized training plans for 5K, 10K, half marathon, and marathon distances.",
              },
            ].map(({ icon, title, body }) => (
              <RNCard key={title}>
                <RNCardContent>
                  <View
                    style={{
                      height: 48,
                      width: 48,
                      borderRadius: 999,
                      backgroundColor: "#fff7ed",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    {icon}
                  </View>
                  <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 6 }}>
                    {title}
                  </Text>
                  <Text style={{ color: "#6b7280" }}>{body}</Text>
                </RNCardContent>
              </RNCard>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 8, textAlign: "center" }}>
            Ready to Start Your Journey?
          </Text>
          <Text
            style={{
              color: "#6b7280",
              textAlign: "center",
              marginBottom: 16,
              maxWidth: 560,
            }}
          >
            Join millions of runners tracking their progress, connecting with friends, and reaching
            their goals.
          </Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <RNButton size="lg">Sign Up Free</RNButton>
            <RNButton size="lg" variant="outline">
              Learn More
            </RNButton>
          </View>

          <Text style={{ marginTop: 12, color: "#6b7280", fontSize: 12, textAlign: "center" }}>
            Free to join. Available on iOS and Android.
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
              The social network for athletes around the world.
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
            © 2025 PACER. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* Mobile menu (Sheet replacement) */}
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
            <LinkText href="#features">Features</LinkText>
            <LinkText href="#community">Community</LinkText>
            <LinkText href="#pricing">Pricing</LinkText>

            <View style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 12 }} />

            <RNButton full variant="outline" onPress={() => {}}>
              Log In
            </RNButton>
            <View style={{ height: 8 }} />
            <RNButton full onPress={() => {}}>
              Sign Up Free
            </RNButton>
          </View>
        </View>
      </Modal>
    </View>
  );
}
