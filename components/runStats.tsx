import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  timeSeconds: number;
  distanceMeters: number;
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

export const RunStats: React.FC<Props> = ({
  timeSeconds,
  distanceMeters,
}) => {
  const distanceKm = distanceMeters / 1000;

  return (
    <View style={styles.statsRow}>
      <View style={styles.stat}>
        <Text style={styles.statLabel}>Time</Text>
        <Text style={styles.statValue}>{formatTime(timeSeconds)}</Text>
      </View>

      <View style={styles.stat}>
        <Text style={styles.statLabel}>Distance</Text>
        <Text style={styles.statValue}>{distanceKm.toFixed(2)} km</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  stat: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#1f2937",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f9fafb",
  },
});
