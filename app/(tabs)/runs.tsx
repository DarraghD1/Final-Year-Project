import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View
} from "react-native";
import { fetchRuns, Run } from "../../api/runs";
import { useAuth } from "../../context/AuthContext";

/* Page for displaying users past runs */

type RunForm = {
  date: string;
  distance: string; // km
  duration: string; // mm:ss or hh:mm:ss
  notes?: string;
};

export default function RunsScreen() {
  const { token } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<RunForm>({ date: "", distance: "", duration: "", notes: "" });

  const loadRuns = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchRuns(token);
      // return array of runs
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

  // display time clearly in hh:mm:ss format
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
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const toElevation = (meters?: number | null) => {
    if (meters == null) return "-";
    return `${Math.round(meters)} m`;
  };

  // data presentation
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add a Run</Text>

      <Text style={[styles.title, { marginTop: 20 }]}>Your Runs</Text>
      <FlatList
        data={runs}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => (
          <View style={styles.runItem}>
            <Text style={styles.runText}>Run #{String(item.id)}</Text>
            <Text style={{ color: "#444", marginTop: 6 }}>Distance: {toKilometer(item.distance)}</Text>
            <Text style={{ color: "#444" }}>Time: {formatTime(item.time)}</Text>
            <Text style={{ color: "#444" }}>Elevation: {toElevation(item.elevation_gain)}</Text>
            <Text style={{ color: "#444" }}>Temperature: {item.weather_temp}°C</Text>
            <Text style={{ color: "#444" }}>Precipitation: {item.weather_precip_mm}mm</Text>
          </View>
        )}
        keyExtractor={(r, i) => String(r.id) + String(i)}
        ListEmptyComponent={<Text style={{ color: "#3d3d3dff" }}>No runs yet — record your first one by pressing 'Record'</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  runItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f6f6f6",
    marginBottom: 8,
  },
  runText: { color: "#111" },
});
