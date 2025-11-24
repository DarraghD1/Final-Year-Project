import React from "react";
import { Button, Platform, StyleSheet, Text, View } from "react-native";
import { API_BASE_URL } from "../../api/auth";
import { RunStats } from "../../components/runStats";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../hooks/useLocation";
import { useStopwatch } from "../../hooks/useStopwatch";


/* Screen for recording run activity */
export default function RunRecorderScreen() {

  const { token } = useAuth();


  // import location tracking and stopwatch hooks
  const {
    hasPermission,
    isTracking,
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

  // permission UI
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

  const handlePauseRun = () => {
    pause();
    stopTracking();
  };

  const handleUnpauseRun = async () => {
    const ok = await startTracking();
    if (!ok) return;

    unpause();
  };

  // send run info payload to backend and await response
  const saveRunData = async (
    locations: Array<any>,  // currently unused
    distance: number,
    timeSeconds: number
  ) => {
    if(!token){
      console.warn("No authorisation token, run cannot be saved");
      return false;
    }

try {
    const payload = {
      distance: Math.round(distance),
      time: Math.round(timeSeconds), 
    };

    const response = await fetch(`${API_BASE_URL}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn("Failed to save run:", response.status, text);
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

  const handleStopRun = async () => {
    stopTracking();
    stop();

    const ok = await saveRunData(locations, distance, seconds);

    if (!ok) {
      return (
      <View style={styles.center}>
        <Text style={styles.warning}>
          Error: Failed to save run
        </Text>
      </View>
    );
    }
};

  const isRecording = isTracking;

  // basic UI for run tracking 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Run Tracker</Text>

      <RunStats
        timeSeconds={seconds}
        distanceMeters={distance}
      />

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
    </View>       // map view can be added here later
  ); 
}

// page styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
    backgroundColor: "#ffffffff",
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
    color: "#e5e7eb",
    textAlign: "center",
    marginBottom: 24,
  },
  buttonsRow: {
    marginTop: "auto",
  },
  warning: {
    color: "#f97373",
    textAlign: "center",
  },
});
