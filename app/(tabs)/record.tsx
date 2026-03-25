import MapboxGL from '@rnmapbox/maps';
import * as Location from "expo-location";
import React, { useState } from "react";
import { Alert, Button, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from "react-native";
import { API_BASE_URL } from "../../api/auth";
import { predictRunTime } from "../../api/ml";
import { useAuth } from "../../context/AuthContext";
import { RunStats } from "../../frontend/components/runStats";
import { useLocation } from "../../frontend/hooks/useLocation";
import { useStopwatch } from "../../frontend/hooks/useStopwatch";


/* Screen for entering goal, Race Strategy & recording run activity */
export default function RunRecorderScreen() {

  const { token } = useAuth();
  const [showRecorder, setShowRecorder] = useState(false);
  const [showPacing, setShowPacing] = useState(false);
  const [goalDistance, setGoalDistance] = useState("");
  const [goalTime, setGoalTime] = useState("");
  const [savedGoal, setSavedGoal] = useState<{ distance: string; time: string } | null>(null);
  const [selectedPacing, setSelectedPacing] = useState("positive");
  const [predictingGoal, setPredictingGoal] = useState(false);
  const [predictedSeconds, setPredictedSeconds] = useState<number | null>(null);
  const [predictError, setPredictionError] = useState<string | null>(null);
  const [shapValues, setShapValues] = useState<Record<string, number> | null>(null);
  const [recentPerformanceAdjustmentSeconds, setRecentPerformanceAdjustmentSeconds] = useState<number | null>(null);
  
  // public access token for mapbox
  MapboxGL.setAccessToken('pk.eyJ1IjoiZGFycmFnaGRvbm5lbGx5IiwiYSI6ImNtazRmY3dybDAwYzYzZnNoaW9tOWpmZXIifQ.0uXzsLO0Lud1u2S93tCbCQ');

  // import location tracking and stopwatch hooks
  const {
    hasPermission,
    locations,
    distance,
    startTracking,
    stopTracking,
  } = useLocation();

  const { 
    seconds, 
    status,
    start, 
    pause, 
    unpause,
    stop, 
    reset 
  } = useStopwatch();


  // prevent users on web from recording runs - change later
  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <Text>Run recording is only available on the mobile app.</Text>
      </View>
    );
  }

  // location permission UI
  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <Text>Requesting Location Permission...</Text>
      </View>
    );
  }

  // permission denied UI
  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.warning}>
          No access to location. Please enable location permissions in settings.
        </Text>
      </View>
    );
  }

  const handleStartRun = async () => {
    const ok = await startTracking();
    if (!ok) return;

    // reset and start timer when tracking starts
    reset();
    start();
  };

  // formatting for time separates into hh:mm:ss
  const formatGoalTimeInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);

    if (digits.length <= 2) {
      return digits;
    }

    if (digits.length <= 4) {
      return `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
    }

    return `${digits.slice(0, digits.length - 4)}:${digits.slice(-4, -2)}:${digits.slice(-2)}`;
  };

  // allow user to enter goal
  const handleEnterGoal = async () => {
    const trimmedDistance = goalDistance.trim();
    const trimmedTime = goalTime.trim();

    if (!trimmedDistance || !trimmedTime) {
      Alert.alert("Missing goal", "Enter valid distance and a time, or press Just Run.");
      return;
    }

    // user input distance 
    const distanceKm = Number(trimmedDistance);
    if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 200) {
      Alert.alert("Invalid distance", "Enter a distance between 0.1 km and 200 km.");
      return;
    }

    setPredictingGoal(true);
    setPredictionError(null);
    setPredictedSeconds(null);
    setShapValues(null);
    setRecentPerformanceAdjustmentSeconds(null);

    if (token) {
      try {
        let lat: number | null = null;
        let lon: number | null = null;

        try {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (permission.status === "granted") {
            const location = await Location.getCurrentPositionAsync({});
            lat = location.coords.latitude;
            lon = location.coords.longitude;
          }
        } catch (locationError) {
          console.warn("Unable to get location for goal prediction", locationError);
        }

        const result = await predictRunTime(distanceKm * 1000, lat, lon, token);
        setPredictedSeconds(result.predicted_time_seconds);
        setShapValues(result.shap?.values_seconds ?? null);
        setRecentPerformanceAdjustmentSeconds(result.recent_performance_adjustment_seconds ?? null);
      } catch (err) {
        console.warn("Goal prediction failed", err);
        setPredictionError("Prediction failed.");
      }
    } else {
      setPredictionError("Sign in to get a prediction.");
    }

    // apply goal
    setSavedGoal({ distance: trimmedDistance, time: trimmedTime });
    setShowPacing(true);
    setPredictingGoal(false);
  };

  const handleJustRun = () => {
    setSavedGoal(null);
    setShowPacing(false);
    setPredictingGoal(false);
    setPredictedSeconds(null);
    setPredictionError(null);
    setShapValues(null);
    setRecentPerformanceAdjustmentSeconds(null);
    setShowRecorder(true);
  };

  const handlePauseRun = () => {
    pause();
    stopTracking();
  };

  const handleUnpauseRun = async () => {
    const ok = await startTracking();
    if (!ok) return;

    unpause();
  };

  // compute elevation gain from points taken on the run using altitude data from loc samples **Accuracy needs to be improved
  const getElevationGain = (samples: Location.LocationObject[]) => {
    const elevations = samples
      .map((sample) => sample.coords?.altitude)
      .filter((altitude): altitude is number => typeof altitude === "number" && Number.isFinite(altitude));

    if (elevations.length < 2) return null;

    // return final elevation gain via simple max - min method
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    return maxElevation - minElevation;
  };

  // send run info payload to backend and await response
  const saveRunData = async (
    locations: any[],
    distance: number,
    timeSeconds: number
  ) => {
    if(!token){
      console.warn("No authorisation token, run cannot be saved");
      return false;
    }

    // get last long & lat for weather data, handle missing coords 
try {
    const lastLocation =
      locations && locations.length > 0 ? locations[locations.length - 1] : null;

    let lat = lastLocation?.coords?.latitude;
    let lon = lastLocation?.coords?.longitude;

    // try get current location if missing from samples
    if ((lat == null || lon == null) && hasPermission) {
      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = current.coords.latitude;
        lon = current.coords.longitude;
      } catch (err) {
        console.warn("Unable to get current location for weather", err);
      }
    }

    // payload with run data
    const payload = {
      distance: Math.round(distance),
      time: Math.round(timeSeconds),
      elevation_gain: (() => {
        const gain = getElevationGain(locations);
        return gain == null ? null : Math.round(gain);
      })(),
      lat,
      lon,
    };

    // send request to backend to save run data
    const response = await fetch(`${API_BASE_URL}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    // error handling
    if (!response.ok) {
      const text = await response.text();
      console.warn("Failed to save run:", response.status, text);
      Alert.alert("Save failed", "Your run could not be saved.");
      return false;
    }

    const data = await response.json();
    console.log("Run saved:", data);
    return true;
  } catch (error) {
    console.error("Error saving run:", error);
    return false;
  }
};

  // stop run, save data, and handle response
  const handleStopRun = async () => {
    stopTracking();
    stop();

    const ok = await saveRunData(locations, distance, seconds);

    if (!ok) {
      return;
    }
};

  // UI state variables
  const shouldFollowUser = hasPermission === true;
  const shouldShowRoute = status !== "idle" && locations && locations.length > 0;
  const elevationGain = getElevationGain(locations);

  // read in goal dist, convert to number if its a string
  const targetDistanceKm = Number(savedGoal?.distance ?? goalDistance);

  // convert target time string of hh:mm:ss to seconds
  const targetTimeSeconds = parseGoalTimeToSeconds(savedGoal?.time ?? goalTime);

  // build the pacing strategy if entries are valid - return empty array if any checks fail
  const pacingBreakdown =
    Number(targetDistanceKm > 0) && targetTimeSeconds != null
      ? getPacingStrat(targetDistanceKm, targetTimeSeconds, selectedPacing): [];

  // compute average pace accross full distance for valid entries - null if invalid entries
  const averagePace =
    Number.isFinite(targetDistanceKm) && targetDistanceKm > 0 && targetTimeSeconds != null
      ? formatSecondsToPace(targetTimeSeconds / targetDistanceKm)
      : null;

  const formatTime = (secs?: number | null) => {
    if (secs == null) return "-";
    const totalSeconds = Math.round(Number(secs));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const formatSignedSeconds = (secs?: number | null) => {
    if (secs == null) return "-";
    const sign = secs >= 0 ? "+" : "-";
    return `${sign}${Math.round(Math.abs(secs))} sec`;
  };


  // *****************************    Goal setting screen    *****************************
  if (!showPacing && !showRecorder) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>Got a goal?</Text>
          <Text style={styles.setupSubtitle}>
            Enter your target distance and time or just run.
          </Text>

          <TextInput
            value={goalDistance}
            onChangeText={setGoalDistance}
            placeholder="Distance goal (km)"
            style={styles.input}
            keyboardType="numeric"
          />

          <TextInput
            value={goalTime}
            onChangeText={(value) => setGoalTime(formatGoalTimeInput(value))}
            placeholder="Time goal (mm:ss)"
            style={styles.input}
            keyboardType="numeric"
          />

          <View style={styles.actionButtons}>
            <View style={styles.buttonSpacing}>
              <Button title={predictingGoal ? "Preparing..." : "Enter"} onPress={handleEnterGoal} disabled={predictingGoal} />
            </View>
            <Button title="Just Run" onPress={handleJustRun} />
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }


// take target time and format it
function parseGoalTimeToSeconds(value: string) {

  const parts = value.trim().split(":");

  // for times mm:ss
  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);

    // check for non valid numbers
    if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
      return null;
    }
    return minutes * 60 + seconds;
  }

  // for times hh:mm:ss
  if (parts.length === 3) {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);

    if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) {
      return null;
    }
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

// pace formatting to give km/min
function formatSecondsToPace(totalSeconds: number) {

  const rounded = Math.round(totalSeconds);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// template for pace strategies based on distance
function getPacingTemplate(distanceKm: number) {

  // add/subtract time for different dist ranges
  if (distanceKm <= 5) {
    return [3, 1, 0, -1, -3];
  }
  if (distanceKm <= 10) {
    return [4, 3, 2, 1, 0, 0, -1, -2, -3, -4];
  }
  if (distanceKm <= 21.1) {
    return [6, 5, 4, 3, 2, 1, 0, 0, 0, -1, -2, -3, -4, -5, -6];
  }
  return [8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, -1, -2, -3, -4, -5, -6, -7, -8];
}

// pick value from above template based on number of splits
function getOffsetForSplit(template: number[], splitIndex: number, splitCount: number) {

  if (splitCount <= 1) return template[0] ?? 0;

  // find where split is relative to full dist
  const splitProgress = splitIndex / (splitCount - 1);

  // get position in template via index
  const templateIndex = Math.round(splitProgress) * (template.length - 1);

  // return number
  return template[templateIndex] ?? 0;
}

// pacing strategy function reads in user target distance, time and desired pacing type
function getPacingStrat(distanceKm: number, totalSeconds: number, pacingType: string) {

  const list: { label: string; pace: string; split: string; }[] = [];

  // ensure valid entries
  if (!distanceKm || !totalSeconds || distanceKm <= 0 || totalSeconds <= 0) {
    return list;
  }

  // calculate average pace required
  const avgPace = totalSeconds / distanceKm;
  // number of km = num splits
  const splitCount = Math.max(1, Math.round(distanceKm));
  const template = getPacingTemplate(distanceKm);
  const offsets: number[] = [];

  for (let i = 0; i < splitCount; i++) {
    let offset = 0;

    if (pacingType === "negative") {
      offset = getOffsetForSplit(template, i, splitCount);
    }

    // reverse pace strat if positive
    if (pacingType === "positive") {
      offset = -getOffsetForSplit(template, i, splitCount);
    }
    offsets.push(offset);
  }

  // keep pacing plan anchored to target average pace
  const offsetAverage = offsets.reduce((sum, offset) => sum + offset, 0) / offsets.length;

  for (let i = 0; i < splitCount; i++) {
    const pace = avgPace + offsets[i] - offsetAverage;

    // add pace segments to list for different strategies
    list.push({
      label: `Km ${i + 1}`,
      pace: `${formatSecondsToPace(pace)} /km`,
      split: formatSecondsToPace(pace),
    });
  }
  return list;
}


  // *****************************   Pacing strategy screen   *****************************
  if (showPacing && !showRecorder) {
    return (
      <ScrollView contentContainerStyle={styles.pacingContainer}>
        <Text style={styles.title}>Pick your pacing plan</Text>

        {/* tab list user can click through to get different pacing strategies */}
        <View style={styles.tabList}>
          <Pressable
            onPress={() => setSelectedPacing("positive")}
            style={[
              styles.tabButton, selectedPacing === "positive" ? styles.tabButtonActive : null,
            ]}>
            <Text
              style={[
                styles.tabButtonText,
                selectedPacing === "positive" ? styles.tabButtonTextActive : null,
              ]}>
              Positive Pacing
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedPacing("even")}
            style={[
              styles.tabButton,
              selectedPacing === "even" ? styles.tabButtonActive : null,
            ]}>
            <Text
              style={[
                styles.tabButtonText,
                selectedPacing === "even" ? styles.tabButtonTextActive : null,
              ]}>
              Even Pacing
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedPacing("negative")}
            style={[
              styles.tabButton,
              selectedPacing === "negative" ? styles.tabButtonActive : null,
            ]}>
            <Text
              style={[
                styles.tabButtonText,
                selectedPacing === "negative" ? styles.tabButtonTextActive : null,
              ]}>
              Negative Pacing
            </Text>
          </Pressable>
        </View>

        {/* display pacing segments based on strat */}
        <View style={styles.pacingCard}>
          <Text style={styles.pacingTitle}>Target Strategy</Text>
          <Text style={styles.pacingMeta}>
            Goal: {savedGoal?.distance ?? goalDistance} km in {savedGoal?.time ?? goalTime}
          </Text>
          {averagePace ? (
            <Text style={styles.pacingMeta}>Average pace: {averagePace} /km</Text>
          ) : (
            <Text style={styles.warning}>Enter a valid distance and time goal.</Text>
          )}

          {pacingBreakdown.map((split) => (
            <View key={split.label} style={styles.pacingRow}>
              <Text style={styles.pacingRowLabel}>{split.label}</Text>
              <View>
                <Text style={styles.pacingRowValue}>Split: {split.pace}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.predictionCard}>
          <Text style={styles.pacingTitle}>Prediction</Text>
          <Text style={styles.pacingMeta}>
            Predicted time for {savedGoal?.distance ?? goalDistance} km: {predictingGoal ? "Calculating..." : formatTime(predictedSeconds)}
          </Text>
          {recentPerformanceAdjustmentSeconds != null ? (
            <Text style={styles.pacingMeta}>
              Recent form: {formatSignedSeconds(recentPerformanceAdjustmentSeconds)}
            </Text>
          ) : null}
          {shapValues ? (
            <View style={styles.predictionFactors}>
              <Text style={styles.pacingMeta}>Temp impact: {formatSignedSeconds(shapValues.weather_temp)}</Text>
              <Text style={styles.pacingMeta}>Precip impact: {formatSignedSeconds(shapValues.weather_precip_mm)}</Text>
              <Text style={styles.pacingMeta}>Humidity impact: {formatSignedSeconds(shapValues.weather_humidity)}</Text>
              <Text style={styles.pacingMeta}>Wind impact: {formatSignedSeconds(shapValues.weather_wind_kph)}</Text>
            </View>
          ) : null}
          {predictError ? <Text style={styles.predictionError}>{predictError}</Text> : null}
        </View>

        <View style={styles.pacingButtons}>
          <View style={styles.buttonSpacing}>
            <Button title="Continue" onPress={() => setShowRecorder(true)} />
          </View>
          <Button title="Exit" onPress={() => { setShowRecorder(false), setShowPacing(false); }}/>
        </View>
      </ScrollView>
    );
  }


  // *****************************    Run recording screen    *****************************
  return (
    <View style={styles.container}>

      {/* display users goal (if entered) at top of screen */}
      {savedGoal ? (
        <View style={styles.goalCard}>
          <Text style={styles.goalTitle}>Goal</Text>
          <Text style={styles.goalText}>Distance: {savedGoal.distance}</Text>
          <Text style={styles.goalText}>Time: {savedGoal.time}</Text>
        </View>
      ) : null}

      {/* live run stats */}
      <RunStats
        timeSeconds={seconds}
        distanceMeters={distance}
        elevationGainMeters={elevationGain}
      />

  {/* insert Mapbox map */}
  {(Platform.OS === 'ios' || Platform.OS === 'android') && (
        <View style={styles.mapWrap}>

          <MapboxGL.MapView style={styles.map}>
            <MapboxGL.Camera
              zoomLevel={14}
              followUserLocation={shouldFollowUser}
              followUserMode={MapboxGL.UserTrackingModes.Follow}
              centerCoordinate={
                locations && locations.length > 0
                  ? [locations[locations.length - 1].coords.longitude, locations[locations.length - 1].coords.latitude]
                  : [0, 0]
              }
            />

                {shouldFollowUser && <MapboxGL.UserLocation visible={true} />}

                {shouldShowRoute && locations.length > 1 && (
                  <MapboxGL.ShapeSource
                    id="routeSource"
                    shape={{ type: 'Feature', geometry: { type: 'LineString', coordinates: locations.map((l: any) => [l.coords.longitude, l.coords.latitude]) }, properties: {} }}
                  >
                    <MapboxGL.LineLayer id="routeLine" style={{ lineColor: '#00ff6eff', lineWidth: 6 }} />
                  </MapboxGL.ShapeSource>
                )}

                {shouldShowRoute && (
                  <MapboxGL.PointAnnotation
                    id="current"
                    coordinate={[locations[locations.length - 1].coords.longitude, locations[locations.length - 1].coords.latitude]}
                  >
                    <View style={styles.currentMarker} />
                  </MapboxGL.PointAnnotation>
                )}
          </MapboxGL.MapView>
        </View>
      )}

      <View style={styles.buttonsRow}>
      {status === 'idle' && (
        <Button title="Start Run" onPress={handleStartRun} />
      )}

      {status === 'running' && (
        <Button title="Pause Run" onPress={handlePauseRun} />
      )}
      
      {status === 'paused' && (
        <>
          <Button title="Resume Run" onPress={handleUnpauseRun} />
          <Button title="End Run" onPress={handleStopRun} />      
        </>
      )}


    </View>
    </View>
  ); 
}

// page styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 10,
    backgroundColor: "#fff",
  },
  setupContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  setupSubtitle: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
  },
  actionButtons: {
    marginTop: 8,
  },
  buttonSpacing: {
    marginBottom: 12,
  },
  tabList: {
    flexDirection: "row",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    overflow: "hidden",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: "#f3f4f6",
  },
  tabButtonActive: {
    backgroundColor: "#2563eb",
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
  },
  tabButtonTextActive: {
    color: "#ffffff",
  },
  pacingContainer: {
    padding: 16,
    paddingTop: 10,
    backgroundColor: "#fff",
  },
  pacingCard: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#f9fafb",
    marginBottom: 20,
  },
  pacingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  pacingMeta: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 6,
  },
  pacingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  pacingRowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  pacingRowValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
  },
  pacingRowSubvalue: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 2,
  },
  pacingButtons: {
    paddingBottom: 24,
  },
  predictionCard: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#eff6ff",
    marginBottom: 20,
  },
  predictionFactors: {
    marginTop: 8,
  },
  predictionError: {
    color: "#b3261e",
    marginTop: 6,
  },
  goalCard: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 5,
    marginBottom: 20,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1d4ed8",
    marginBottom: 8,
  },
  goalText: {
    fontSize: 15,
    color: "#1f2937",
    marginBottom: 4,
  },
  mapWrap: {
    height: 300,
    marginVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    height: '100%',
  },
  currentMarker: {
    width: 20,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1893ffff',
    borderWidth: 2,
    borderColor: '#fff',
  },
  buttonsRow: {
    marginTop: 40,
  },
  warning: {
    color: "#f97373",
    textAlign: "center",
  },

});
