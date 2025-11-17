import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View
} from "react-native";
import { fetchRuns, Run } from "../../api/runs";

type RunForm = {
  date: string;
  distance: string; // km
  duration: string; // mm:ss or hh:mm:ss
  notes?: string;
};

export default function RunsScreen() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [form, setForm] = useState<RunForm>({ date: "", distance: "", duration: "", notes: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchRuns();
        setRuns(data.runs ?? []);
      } catch (err) {
        console.warn("Failed to fetch runs", err);
      }
    })();
  }, []);

  const validate = (f: RunForm) => {
    if (!f.date.trim()) return "Date is required";
    if (!f.distance.trim() || Number.isNaN(Number(f.distance))) return "Distance is required and must be a number";
    if (!f.duration.trim()) return "Duration is required";
    return null;
  };

  const addRun = async () => {
    const err = validate(form);
    if (err) {
      Alert.alert("Validation", err);
      return;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add a Run</Text>

      <Text style={[styles.title, { marginTop: 20 }]}>Your Runs</Text>
      <FlatList
        data={runs}
        renderItem={({ item }) => (
          <View style={styles.runItem}>
            <Text style={styles.runText}>{item.id}</Text>
          </View>
        )}
        keyExtractor={(r, i) => r.id + i}
        ListEmptyComponent={<Text style={{ color: "#666" }}>No runs yet — record your first one by pressing 'Record'</Text>}
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
