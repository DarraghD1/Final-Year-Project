import React from "react";
import { Button, Platform, StyleSheet, Text, View } from "react-native";
import { RunStats } from "../../components/runStats";
import { useLocation } from "../../hooks/useLocation";
import { useStopwatch } from "../../hooks/useStopwatch";

// Screen for recording run activity
export default function RunRecorderScreen() {

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

  const handleStopRun = () => {
    stopTracking();
    stop();

    // ** add send locations, distance adn time to backend here
  };

  const isRecording = isTracking;

  // basic UI
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Run Tracker</Text>

      <RunStats
        timeSeconds={seconds}
        distanceMeters={distance}
      />

      <View style={styles.buttonsRow}>
      {status === 'idle' && (
        <Button title="Start Run" onPress={start} />
      )}

      {status === 'running' && (
        <Button title="Pause Run" onPress={pause} />
      )}
      
      {status === 'paused' && (
        <>
          <Button title="Resume Run" onPress={unpause} />
          <Button title="End Run" onPress={reset} />      
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
