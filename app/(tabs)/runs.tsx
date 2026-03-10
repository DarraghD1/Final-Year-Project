import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { predictRunTime } from "../../api/ml";
import { deleteRun, fetchRuns, Run } from "../../api/runs";
import { useAuth } from "../../context/AuthContext";

/*  Page for displaying users past runs  */

export default function RunsScreen() {
  const { token } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<number | string | null>(null);
  const [predictDistanceKm, setPredictDistanceKm] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [predictedSeconds, setPredictedSeconds] = useState<number | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);

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
    return `${Math.round(meters)} m`;
  };

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

  // handle prediction request
  const handlePredict = async () => {
    if (!token) {
      setPredictError("Sign in to get a prediction.");
      return;
    }
    // allow distances between 0-200km
    const distanceKm = Number(predictDistanceKm);
    if (distanceKm > 200 || distanceKm <= 0) {
      setPredictError("Enter a valid distance in (0.1km - 200km).");
      return;
    }
    setPredictError(null);
    setPredicting(true);

    // call prediction API and handle response
    try {
      const distanceMeters = distanceKm * 1000;
      const result = await predictRunTime(distanceMeters, token);
      setPredictedSeconds(result.predicted_time_seconds);
    } catch (err) {
      console.warn("Prediction failed", err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Prediction failed. Train the model first.";
      setPredictError(message);
    } finally {
      setPredicting(false);
    }
  };

  // data presentation
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Predict a Run</Text>
      <TextInput
        style={styles.input}
        placeholder="Distance (km)"
        value={predictDistanceKm}
        onChangeText={setPredictDistanceKm}
        keyboardType="numeric"
      />
      <Pressable style={styles.button} onPress={handlePredict} disabled={predicting}>
        <Text style={styles.buttonText}>
          {predicting ? "Predicting..." : "Get Prediction"}
        </Text>
      </Pressable>
      <View style={styles.predictionBox}>
        <Text style={styles.predictionLabel}>Predicted time</Text>
        <Text style={styles.predictionValue}>
          {predictedSeconds == null ? "-" : formatTime(predictedSeconds)}
        </Text>
        {predictError ? <Text style={styles.errorText}>{predictError}</Text> : null}
      </View>

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
            <Pressable
              style={[
                styles.deleteButton,
                deletingRunId === item.id ? styles.deleteButtonDisabled : null,
              ]}
              onPress={() => handleDeleteRun(item.id)}
              disabled={deletingRunId === item.id}
            >
              <Text style={styles.deleteButtonText}>
                {deletingRunId === item.id ? "Deleting..." : "Delete"}
              </Text>
            </Pressable>
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
  predictionBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f0f4ff",
  },
  predictionLabel: { color: "#3b4a6b", fontWeight: "600" },
  predictionValue: { color: "#111", fontSize: 18, marginTop: 6 },
  errorText: { color: "#b3261e", marginTop: 6 },
  runItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f6f6f6",
    marginBottom: 8,
  },
  runText: { color: "#111" },
  deleteButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#b3261e",
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
