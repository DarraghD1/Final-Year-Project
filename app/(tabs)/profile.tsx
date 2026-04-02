import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { fetchRuns, Run } from "../../api/runs";
import { fetchUserProfile, updateUserProfile } from "../../api/user";
import { useAuth } from "../../context/AuthContext";

const SEX_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

function formatDisplayName(email: string | null) {
  if (!email) return "Runner";

  // set username to email before @
  const username = email.split("@")[0];
  const words = username
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean);

  if (words.length === 0) return "Runner";

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatKilometers(meters: number) {
  return (meters / 1000).toFixed(2);
}

// return users longest run
function getLongestRun(runs: Run[]) {
  let best: Run | null = null;

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];

    if (typeof run.distance !== "number" || run.distance <= 0) {
      continue;
    }

    if (best === null) {
      best = run;
      continue;
    }

    if (run.distance > (best.distance ?? 0)) {
      best = run;
    }
  }

  return best;
}

export default function ProfileScreen() {
  const { token, email, signOut } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // load runs when user logins or refreshes page
  useEffect(() => {
    const loadProfileData = async () => {
      if (!token) {
        setRuns([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const [runsData, profile] = await Promise.all([
          fetchRuns(token),
          fetchUserProfile(token),
        ]);
        setRuns(runsData ?? []);
        setAge(profile.age != null ? String(profile.age) : "");
        setSex(profile.sex ?? null);
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Failed to load run stats.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [token]);

  // get sum of all runs and longest run
  const totalDistanceMeters = useMemo(() => {
    return runs.reduce((sum, run) => {
      if (typeof run.distance !== "number" || run.distance <= 0) {
        return sum;
      }
      return sum + run.distance;
    }, 0);
  }, [runs]);

  const longestRun = useMemo(() => getLongestRun(runs), [runs]);

  const displayName = useMemo(() => formatDisplayName(email), [email]);
  const ageNumber = useMemo(() => {
    if (!age.trim()) return null;
    const value = Number(age);
    if (Number.isNaN(value)) return null;
    return value;
  }, [age]);

  const handleSaveProfile = async () => {
    if (!token) return;

    setError(null);
    setSuccess(null);

    if (ageNumber != null && (ageNumber < 5 || ageNumber > 120)) {
      setError("Age must be between 5 and 120.");
      return;
    }

    setSaving(true);

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

  // UI for profile page - displays name, total dist, total runs, longest run adn logout buttom
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.eyebrow}>Profile</Text>
          <Text style={styles.name}>{displayName}</Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}

          <View style={styles.statsRow}>
            <View style={[styles.card, styles.distanceCard]}>
              <Text style={[styles.cardLabel, styles.distanceCardLabel]}>Total Distance</Text>
              <Text style={[styles.cardValue, styles.distanceCardValue]}>
                {loading ? "..." : formatKilometers(totalDistanceMeters)}
                <Text style={styles.cardUnit}> km</Text>
              </Text>
            </View>

            <View style={styles.statPairRow}>
              <View style={[styles.card, styles.halfCard]}>
                <Text style={styles.cardLabel}>Total Runs</Text>
                <Text style={styles.cardValue}>{loading ? "..." : runs.length}</Text>
              </View>

              <View style={[styles.card, styles.halfCard]}>
                <Text style={styles.cardLabel}>Longest Run</Text>
                <Text style={styles.cardValueLongestRun}>
                  {loading ? "..." : longestRun ? formatKilometers(longestRun.distance ?? 0) : "-"}
                  {loading || !longestRun ? null : <Text style={styles.smallUnit}>km</Text>}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.detailsCard}>

            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 22"
              placeholderTextColor="#94a3b8"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              editable={!loading && !saving}
            />

            <Text style={styles.inputLabel}>Sex</Text>
            <View style={styles.choiceRow}>
              {SEX_OPTIONS.map((option) => {
                const selected = sex === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setSex(option.value)}
                    style={[styles.choice, selected ? styles.choiceSelected : null]}
                    disabled={saving}
                  >
                    <Text style={selected ? styles.choiceTextSelected : styles.choiceText}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.saveButton, saving ? styles.saveButtonDisabled : null]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save"}</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}
        </View>
      </ScrollView>

      <Pressable style={styles.logoutButton} onPress={signOut}>
        <MaterialIcons name="logout" size={18} color="#ea0909ff" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </View>
  );
}
// styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    backgroundColor: "#f3f6fc",
  },
  content: {
    paddingBottom: 20,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#5a6b85",
    marginBottom: 12,
    top: 35
  },
  name: {
    fontSize: 34,
    fontWeight: "800",
    color: "#142033",
    marginBottom: 6,
    top: 35
  },
  email: {
    fontSize: 16,
    color: "#5f6c80",
    marginBottom: 28,
    top: 35
  },
  statsRow: {
    gap: 14,
    marginBottom: 18,
  },
  statPairRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    top: 100
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
  },
  halfCard: {
    width: "48%",
    height: 115,
    padding: 16,
  },
  distanceCard: {
    backgroundColor: "#0b1525",
    top: 100
  },
  cardLabel: {

    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#7f8ca3",
    marginBottom: 18,
  },
  distanceCardLabel: {
    color: "#9fb0c9",
  },
  cardValue: {
    fontSize: 38,
    fontWeight: "800",
    color: "#162234",
  },
  cardValueLongestRun: {
    fontSize: 38,
    right: 10,
    fontWeight: "800",
    color: "#162234",
  },
  distanceCardValue: {
    color: "#f4f7ff",
  },
  cardUnit: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6ea2ff",
  },
  smallUnit: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5f6c80",
  },
  detailsCard: {
    bottom: 394,
    left: 150,
    borderRadius: 24,
    padding: 22,
    backgroundColor: "#142033",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    width: "52%",
    height: 210
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#142033",
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9fb0c9",
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9e2ef",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#142033",
    backgroundColor: "#f8fbff",
    marginBottom: 10,
    marginLeft:-4
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginLeft: 4,
  },
  choice: {
    borderWidth: 1,
    borderColor: "#d0d9e6",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#f8fbff",
    marginRight: 8,
    marginBottom: 18,
  },
  choiceSelected: {
    backgroundColor: "#5e89d8ff",
    borderColor: "#5381d6ff",
  },
  choiceText: {
    color: "#1f2b3d",
    fontWeight: "600",
  },
  choiceTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 8,
    backgroundColor: "#3d6bceff",
    bottom: 18
  },
  saveButtonDisabled: {
    backgroundColor: "#8bb7ff",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  errorText: {
    marginTop: 14,
    color: "#b3261e",
  },
  successText: {
    marginTop: 10,
    color: "#1b6b1b",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingVertical: 16,
    backgroundColor: "#cfcecd03",
  },
  logoutButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#ea0909ff",
  },
});
