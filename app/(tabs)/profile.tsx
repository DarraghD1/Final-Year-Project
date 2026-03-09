import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { fetchUserProfile, updateUserProfile } from "../../api/user";
import { useAuth } from "../../context/AuthContext";

const SEX_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Prefer Not To Say", value: "prefer_not_to_say" },
];

/* screen for users profile */
export default function ProfileScreen() {

  // auth token to call protected endpoints
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // fetch current profile from API 
  const loadProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const profile = await fetchUserProfile(token);

      // normalise API values for display
      setAge(profile.age != null ? String(profile.age) : "");
      setSex(profile.sex ?? null);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Failed to load profile.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // set age to null if not set, number otherwise
  const ageNumber = useMemo(() => {
    const value = Number(age);
    if (!age) return null;
    if (Number.isNaN(value)) return null;
    return value;
  }, [age]);

  // persist profile updates to backend
  const onSave = async () => {
    if (!token) return;
    setError(null);
    setSuccess(null);

    if (ageNumber != null && (ageNumber < 5 || ageNumber > 120)) {
      setError("Age must be between 5 and 120.");
      return;
    }

    setSaving(true);

    // confirm updates to user profile
    try {
      await updateUserProfile(token, {
        age: ageNumber,
        sex: sex ?? null,
      });
      setSuccess("Profile saved.");
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Failed to save profile.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // UI for user profile
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Personalize Your Predictions</Text>
      <Text style={styles.subtitle}>
        Add a few details to improve the base model predictions.
      </Text>

      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 28"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        editable={!loading}
      />

      <Text style={styles.label}>Sex</Text>
      <View style={styles.choiceRow}>
        {SEX_OPTIONS.map((option) => {
          const selected = sex === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setSex(option.value)}
              style={[
                styles.choice,
                selected ? styles.choiceSelected : null,
              ]}
            >
              <Text style={selected ? styles.choiceTextSelected : styles.choiceText}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={[styles.button, saving ? styles.buttonDisabled : null]}
        onPress={onSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Saving..." : "Save"}
        </Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>{success}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#4f4f4f", marginBottom: 16 },
  label: { fontWeight: "600", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },
  choiceRow: { flexDirection: "row", flexWrap: "wrap" },
  choice: {
    borderWidth: 1,
    borderColor: "#c9c9c9",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f7f7f7",
    marginRight: 8,
    marginBottom: 8,
  },
  choiceSelected: {
    backgroundColor: "#0b5fff",
    borderColor: "#0b5fff",
  },
  choiceText: { color: "#1f1f1f", fontWeight: "600" },
  choiceTextSelected: { color: "#fff", fontWeight: "600" },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: "#8bb7ff",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  errorText: { color: "#a40800ff", marginTop: 10 },
  successText: { color: "#1b6b1b", marginTop: 10 },
});
