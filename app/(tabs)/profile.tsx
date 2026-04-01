import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fetchRuns, Run } from "../../api/runs";
import { useAuth } from "../../context/AuthContext";

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
  const [error, setError] = useState<string | null>(null);

  // load runs when user logins or refreshes page
  useEffect(() => {
    const loadRuns = async () => {
      if (!token) {
        setRuns([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchRuns(token);
        setRuns(data ?? []);
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

    loadRuns();
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

  // UI for profile page - displays name, total dist, total runs, longest run adn logout buttom
  return (
    <View style={styles.container}>
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

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

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
  eyebrow: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#5a6b85",
    marginBottom: 12,
  },
  name: {
    fontSize: 34,
    fontWeight: "800",
    color: "#142033",
    marginBottom: 6,
  },
  email: {
    fontSize: 16,
    color: "#5f6c80",
    marginBottom: 28,
  },
  statsRow: {
    gap: 14,
  },
  statPairRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  errorText: {
    marginTop: 14,
    color: "#b3261e",
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
