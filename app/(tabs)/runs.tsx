import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { deleteRun, fetchRuns, Run } from "../../api/runs";
import { useAuth } from "../../context/AuthContext";

const PRs = [
  {label:"Fastest 5k", meters:5000},
  {label:"Fastest 10k",meters:10000},
  {label:"Fastest 15k", meters:15000},
  {label:"Fastest 22k", meters:22000},
  {label:"Fastest 42k", meters:42000},
];

function getLongestRun(runs: Run[]) {
  let best: Run | null = null;

  // loop through users runs
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];

    // skip runs with no valid distance
    if (typeof run.distance !== "number" || run.distance <= 0) {
      continue;
    }

    // set first valid run to 'best' 
    if (best === null) {
      best = run;
      continue;
    }

    // if this run is longer, replace best
    if (run.distance > (best.distance ?? 0)) {
      best = run;
    }
  }

  return best;
}

function getFastestRunForDistance(runs: Run[], targetMeters: number) {
  let best: Run | null = null;

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];

    // skip invalid distance/time
    if (typeof run.distance !== "number" || typeof run.time !== "number") {
      continue;
    }
    if (run.distance < targetMeters || run.time <= 0) {
      continue;
    }

    // set first valid run best
    if (best === null) {
      best = run;
      continue;
    }

    // if this run has a smaller time, it's faster
    if (run.time < (best.time ?? 0)) {
      best = run;
    }
  }

  return best;
}

/*  Page for displaying users past runs  */

export default function RunsScreen() {
  const { token } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<number | string | null>(null);

  // load runs from backend
  const loadRuns = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchRuns(token);
      // return runs in array
      setRuns(data ?? []);
    } catch (err) {
      console.warn("Failed to fetch runs", err);
    }
  }, [token]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  // refreshing added to update run list
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRuns();
    setRefreshing(false);
  }, [loadRuns]);

  // display time in hh:mm:ss format
  const formatTime = (secs?: number) => {
    if (!secs && secs !== 0) return "-";
    const s = Number(secs);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // convert distance to km
  const toKilometer = (meters?: number) => {
    if (meters == null) return "-";
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  const toElevation = (meters?: number | null) => {
    if (meters == null) return "-";
    return `${Math.round(meters)}m`;
  };

  const formatDistanceValue = (meters?: number) => {
    if (meters == null) return "-";
    return (meters / 1000).toFixed(2);
  };

  const formatTemperature = (temp?: number | null) => {
    if (temp == null) return "-";
    return `${Math.round(temp)}°C`;
  };

  const formatRunDate = (value?: string) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()].toUpperCase()} ${date.getDate()}, ${date.getFullYear()}`;
  };

  // convert meters and seconds records into km/min pace
  const formatPace = (meters?: number, secs?: number) => {
    if (meters == null || secs == null || meters <= 0 || secs <= 0) return "-";
    const secondsPerKm = Math.round(secs / (meters / 1000));
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = secondsPerKm % 60;
    return `${minutes}'${String(seconds).padStart(2, "0")}" /km`;
  };

  // useMemo rechecks longest run only when run array is altered 
  const longestRun = useMemo(() => getLongestRun(runs), [runs]);

  // sort runs from most recent to least
  const sortedRuns = useMemo(() => {
    return [...runs].sort(
      (a, b) => Date.parse(b.completed_at!) - Date.parse(a.completed_at!)
    );
  }, [runs]);

  // build PR list attaching relevant runs
  const distancePbs = useMemo(() => PRs.map((distance) => ({

        // copy label/meters from pr list
        ...distance,
        // add best runs if available
        run: getFastestRunForDistance(runs, distance.meters),
      })),
    [runs]
  );

  // give user ability to delete runs
  const handleDeleteRun = useCallback(
    (runId: number | string) => {
      if (!token) return;

      Alert.alert("Delete run", "This will remove the run permanently.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingRunId(runId);
              await deleteRun(runId, token);
              setRuns((prev) => prev.filter((run) => run.id !== runId));
            } catch (err) {
              console.warn("Failed to delete run", err);
              Alert.alert("Delete failed", "Could not delete this run.");
            } finally {
              setDeletingRunId(null);
            }
          },
        },
      ]);
    },
    [token]
  );

  // data presentation
  return (
    <View style={styles.container}>
      <FlatList
        data={sortedRuns}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>

            {/* personal bests display */}
            <Text style={[styles.title, styles.sectionTitle]}>Personal Bests</Text>
            <View style={styles.pbGrid}>
              <View style={styles.pbCard}>
                <Text style={styles.pbLabel}>Longest run</Text>
                <Text style={styles.pbValue}>
                  {longestRun ? toKilometer(longestRun.distance) : "-"}
                </Text>
              </View>
              {distancePbs.map((distance) => (
                <View key={distance.label} style={styles.pbCard}>
                  <Text style={styles.pbLabel}>{distance.label}</Text>
                  <Text style={styles.pbValue}>
                    {distance.run ? formatTime(distance.run.time) : "-"}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.title, styles.sectionTitle]}>Your Runs</Text>
          </View>
        }
        
        // run data from backend formatted and displayed in card  
        renderItem={({ item }) => (
          <View style={styles.runItem}>
            <View style={styles.runHeader}>
              <Text style={styles.runTitle}>Run #{String(item.id)}</Text>
              <Pressable
                style={[
                  styles.deleteIconButton,
                  deletingRunId === item.id ? styles.deleteButtonDisabled : null,
                ]}
                onPress={() => handleDeleteRun(item.id)}
                disabled={deletingRunId === item.id}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Delete run ${String(item.id)}`}
              >
                <MaterialIcons name="delete-outline" size={20} color="#475569" />
              </Pressable>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Distance</Text>
                <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatDistanceValue(item.distance)}
                  {item.distance == null ? null : <Text style={styles.metricUnit}> km</Text>}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Time</Text>
                <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatTime(item.time)}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Avg Pace</Text>
                <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatPace(item.distance, item.time)}
                </Text>
              </View>
            </View>

            <View style={styles.runDivider} />

            <View style={styles.runFooter}>
              <View style={styles.footerStats}>
                <View style={styles.footerStat}>
                  <MaterialIcons name="terrain" size={14} color="#334155" />
                  <Text style={styles.footerText}>{toElevation(item.elevation_gain)}</Text>
                </View>
                <View style={styles.footerStat}>
                  <MaterialIcons name="thermostat" size={14} color="#334155" />
                  <Text style={styles.footerText}>{formatTemperature(item.weather_temp)}</Text>
                </View>
              </View>
              <Text style={styles.dateText}>{formatRunDate(item.completed_at)}</Text>
            </View>
          </View>
        )}
        keyExtractor={(r) => String(r.id)}
        ListEmptyComponent={<Text style={{ color: "#3d3d3dff" }}>No runs yet - record your first one by pressing Record</Text>}
      />
    </View>
  );
}

// styling
const styles = StyleSheet.create({
  container: { 
    padding: 16, 
    flex: 1, 
    paddingTop: 10,
    backgroundColor: "#f3f6ff"
  },
  listContent: { 
    paddingBottom: 24 
  },
  title: { 
    fontSize: 22, 
    fontWeight: "600", 
    marginBottom: 8 
  },
  sectionTitle: { 
    marginTop: 20 
  },
  pbGrid: {
    gap: 8,
    marginTop: 4,
  },
  pbCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pbLabel: {
    color: "#475569",
    fontWeight: "600",
    marginBottom: 4,
  },
  pbValue: {
    color: "#111",
    fontSize: 18,
    fontWeight: "700",
  },
  runItem: {
    padding: 20,
    borderRadius: 8,
    backgroundColor: "#edf3ff",
    marginBottom: 22,
  },
  runHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  runTitle: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "800",
  },
  deleteIconButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  metricItem: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#1f2937",
    fontSize: 19,
    fontWeight: "900",
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: "800",
  },
  runDivider: {
    height: 1,
    backgroundColor: "#dce5f5",
    marginTop: 24,
    marginBottom: 16,
  },
  runFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  footerStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  dateText: {
    color: "#334155",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
