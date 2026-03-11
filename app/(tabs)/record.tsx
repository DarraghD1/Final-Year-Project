import MapboxGL from '@rnmapbox/maps';
import * as Location from "expo-location";
import React, { useState } from "react";
import { Alert, Button, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { API_BASE_URL } from "../../api/auth";
import { RunStats } from "../../components/runStats";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../hooks/useLocation";
import { useStopwatch } from "../../hooks/useStopwatch";


/* Screen for entering goal & recording run activity */
export default function RunRecorderScreen() {

  const { token } = useAuth();
  const [showRecorder, setShowRecorder] = useState(false);
  const [goalDistance, setGoalDistance] = useState("");
  const [goalTime, setGoalTime] = useState("");
  const [savedGoal, setSavedGoal] = useState<{ distance: string; time: string } | null>(null);
  
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

  // allow user to enter goal
  const handleEnterGoal = () => {
    const trimmedDistance = goalDistance.trim();
    const trimmedTime = goalTime.trim();

    if (!trimmedDistance || !trimmedTime) {
      Alert.alert("Missing goal", "Enter valid distance and a time, or press Just Run.");
      return;
    }

    // apply goal
    setSavedGoal({ distance: trimmedDistance, time: trimmedTime });
    // change to recording screen
    setShowRecorder(true);
  };

  const handleJustRun = () => {
    setSavedGoal(null);
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

  // screen user can enter their target distance and time in before run
  if (!showRecorder) {
    return (
      <View style={styles.setupContainer}>
        <Text style={styles.setupTitle}>Got a goal?</Text>
        <Text style={styles.setupSubtitle}>
          Enter your target distance and time or just run.
        </Text>

        <TextInput
          value={goalDistance}
          onChangeText={setGoalDistance}
          placeholder="Distance goal"
          style={styles.input}
          keyboardType="numeric"
        />

        <TextInput
          value={goalTime}
          onChangeText={setGoalTime}
          placeholder="Time goal"
          style={styles.input}
          keyboardType="numeric"
        />

        <View style={styles.actionButtons}>
          <View style={styles.buttonSpacing}>
            <Button title="Enter" onPress={handleEnterGoal} />
          </View>
          <Button title="Just Run" onPress={handleJustRun} />
        </View>
      </View>
    );
  }

  // basic UI for run tracking - map and stats
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

      <RunStats
        timeSeconds={seconds}
        distanceMeters={distance}
        elevationGainMeters={elevationGain}
      />

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
