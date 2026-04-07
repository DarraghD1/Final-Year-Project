import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { logIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await logIn(email, password);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Login to Pacer</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, loading ? styles.primaryButtonDisabled : null]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Signing in..." : "Log In"}
            </Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => router.push("/signup")}>
            <Text style={styles.secondaryButtonText}>Create an account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f6fc",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#5a6b85",
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#142033",
    marginBottom: 10,
    bottom: 1,
    alignSelf: "center",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: "#617186",
    marginBottom: 24,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    height: 450,
    bottom: 70,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#42526a",
    marginBottom: 8,
    top: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9e2ef",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#142033",
    backgroundColor: "#f8fbff",
    marginBottom: 16,
    top: 22,
  },
  error: {
    color: "#b3261e",
    marginBottom: 12,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 15,
    backgroundColor: "#2563eb",
    marginTop: 4,
    top: 35,
  },
  primaryButtonDisabled: {
    backgroundColor: "#8bb7ff",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 6,
    top: 35,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563eb",
  },
});
