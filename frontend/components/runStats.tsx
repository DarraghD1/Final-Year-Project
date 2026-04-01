import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  timeSeconds: number;
  distanceMeters: number;
  elevationGainMeters?: number | null;
};

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

// format pace in min/km
const formatPace = (timeSeconds: number, distanceMeters: number) => {
  if (timeSeconds <= 0 || distanceMeters <= 0) {
    return "-";
  }

  // get sec/km and convert to mins and secs
  const secondsPerKm = timeSeconds / (distanceMeters / 1000);
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);

  // handle invalid inputs
  if (Number.isNaN(minutes) || Number.isNaN(seconds) || !Number.isFinite(secondsPerKm)) {
    return "-";
  }

  // if seconds is 60 round up to nect minute
  if (seconds === 60) {
    return `${minutes + 1}:00 /km`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
};

export const RunStats: React.FC<Props> = ({
  timeSeconds,
  distanceMeters,
  elevationGainMeters,
}) => {
  const distanceKm = distanceMeters / 1000;
  const elevationLabel = elevationGainMeters == null ? "-" : `${Math.round(elevationGainMeters)} m`;
  const paceLabel = formatPace(timeSeconds, distanceMeters);

  return (
    <View style={styles.wrapper}>
      <View style={styles.stat}>
        <Text style={styles.statLabel}>Time</Text>
        <Text style={styles.statValue}>{formatTime(timeSeconds)}</Text>
      </View>

      <View style={styles.stat}>
        <Text style={styles.statLabel}>Distance</Text>
        <Text style={styles.statValue}>{distanceKm.toFixed(2)} km</Text>
      </View>

      <View style={styles.stat}>
        <Text style={styles.statLabel}>Elevation</Text>
        <Text style={styles.statValue}>{elevationLabel}</Text>
      </View>

      <View style={styles.stat}>
        <Text style={styles.statLabel}>Live Pace</Text>
        <Text style={styles.statValue}>{paceLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 6,
  },
  stat: {
    width: "48%",
    marginBottom: 10,
    borderRadius: 14,
    minHeight: 110,
    paddingTop: 16,
    paddingRight: 12,
    paddingLeft: 12,
    paddingBottom: 12,
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  statLabel: {
    position: "absolute",
    top: 12,
    left: 15,
    fontSize: 11,
    color: "#ffffffff",
    fontWeight: "500",
    textAlign: "left",
  },
  statValue: {
    fontSize: 28,
    top: 8,
    fontWeight: "600",
    color: "#f9fafb",
    textAlign: "center",
  },
});
