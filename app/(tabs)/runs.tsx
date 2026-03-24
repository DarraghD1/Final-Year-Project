import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const PRs = [{label:"Fastest 2 mile", meters:3219},
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
  const [predictDistanceKm, setPredictDistanceKm] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [predictedSeconds, setPredictedSeconds] = useState<number | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [shapValues, setShapValues] = useState<Record<string, number> | null>(null);
  const [recentPerformanceAdjustmentSeconds, setRecentPerformanceAdjustmentSeconds] = useState<number | null>(null);

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

  // format added and subtracted times from shap
  const formatSignedSeconds = (secs?: number) => {
    if (secs == null) return "-";
    const sign = secs >= 0 ? "+" : "-";
    return `${sign}${Math.round(Math.abs(secs))} sec`;
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

  // convert meters and seconds records into km/min pace
  const formatPace = (meters?: number, secs?: number) => {
    if (meters == null || secs == null || meters <= 0 || secs <= 0) return "-";
    const secondsPerKm = Math.round(secs / (meters / 1000));
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = secondsPerKm % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")} / km`;
  };

  // useMemo rechecks longest run only when run array is altered 
  const longestRun = useMemo(() => getLongestRun(runs), [runs]);

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
    setShapValues(null);
    setRecentPerformanceAdjustmentSeconds(null);
    setPredicting(true);

    try {
      // convert km to meters
      const distanceMeters = distanceKm * 1000;
      let lat: number | null = null;
      let lon: number | null = null;

      // need permission for location if not granted already
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === "granted") {
          const location = await Location.getCurrentPositionAsync({});
          lat = location.coords.latitude;
          lon = location.coords.longitude;
        }
      } catch (locationError) {
        console.warn("Unable to get location for prediction", locationError);
      }

      // call API to predict time given dist and coords
      const result = await predictRunTime(distanceMeters, lat, lon, token);

      // save predicted time
      setPredictedSeconds(result.predicted_time_seconds);
      setShapValues(result.shap?.values_seconds ?? null);

      // set form influence adjustmebt
      setRecentPerformanceAdjustmentSeconds(result.recent_performance_adjustment_seconds ?? null);
    } 
    // error handling
    catch (err) {
      console.warn("Prediction failed", err);
      setPredictError("Prediction failed.");
    } finally {
      setPredicting(false);
    }
  };

  // data presentation
  return (
    <View style={styles.container}>
      <FlatList
        data={runs}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>

            {/* run prediction entry */}
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

              {/* display recent form influence  */}
              {recentPerformanceAdjustmentSeconds != null ? (
                <Text style={styles.predictionMeta}>
                  Recent form: {formatSignedSeconds(recentPerformanceAdjustmentSeconds)}
                </Text>
              ) : null}

              {/* display SHAP value if available */}
              {shapValues ? (
                <View style={{ marginTop: 8 }}>
                  <Text>Temp impact: {formatSignedSeconds(shapValues.weather_temp)}</Text>
                  <Text>Precip impact: {formatSignedSeconds(shapValues.weather_precip_mm)}</Text>
                  <Text>Humidity impact: {formatSignedSeconds(shapValues.weather_humidity)}</Text>
                  <Text>Wind impact: {formatSignedSeconds(shapValues.weather_wind_kph)}</Text>
                </View>
              ) : null}
              {predictError ? <Text style={styles.errorText}>{predictError}</Text> : null}
            </View>

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
              <Text style={styles.runText}>Run #{String(item.id)}</Text>
              <View>
                {longestRun?.id === item.id ? (
                  <View>
                    <Text>PB Distance</Text>
                  </View>
                ) : null}
                {distancePbs.filter((distance) => distance.run?.id === item.id).map((distance) => (
                  <View key={distance.label}>
                    <Text>PB</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={{ color: "#444", marginTop: 6 }}>Distance: {toKilometer(item.distance)}</Text>
            <Text style={{ color: "#444" }}>Time: {formatTime(item.time)}</Text>
            <Text style={{ color: "#444" }}>Average Pace: {formatPace(item.distance, item.time)}</Text>
            <Text style={{ color: "#444" }}>Elevation: {toElevation(item.elevation_gain)}</Text>
            <Text style={{ color: "#444" }}>Temperature: {item.weather_temp}°C</Text>
            <Text style={{ color: "#444" }}>Precipitation: {item.weather_precip_mm}mm</Text>
            <Text style={{ color: "#444" }}>Humidity: {item.weather_humidity}%</Text>
            <Text style={{ color: "#444" }}>Wind: {item.weather_wind_kph} kph</Text>
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
    backgroundColor: "#ffffffff" 
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
  predictionMeta: { color: "#000000ff", marginTop: 8 },
  errorText: { color: "#b3261e", marginTop: 6 },
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
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f6f6f6",
    marginBottom: 8,
  },
  runHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
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
