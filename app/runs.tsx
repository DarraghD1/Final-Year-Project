import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { createRun, fetchRuns, Run } from "../api/runs";

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

  const updateForm = (key: keyof RunForm, value: string) => setForm({ ...form, [key]: value });

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

    const optimistic: Run = { id: `${form.date} • ${form.distance}km • ${form.duration}` };
    setRuns((r) => [optimistic, ...r]);
    setLoading(true);
    try {
      const created = await createRun({ id: optimistic.id });
      // replace optimistic item with server item if server returns something different
      setRuns((existing) => {
        const withoutOptimistic = existing.filter((x) => x !== optimistic);
        return [created, ...withoutOptimistic];
      });
      setForm({ date: "", distance: "", duration: "", notes: "" });
    } catch (e) {
      // rollback optimistic update
      setRuns((existing) => existing.filter((r) => r !== optimistic));
      Alert.alert("Error", "Failed to create run. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add a Run</Text>

      <TextInput
        placeholder="Date (YYYY-MM-DD)"
        value={form.date}
        onChangeText={(t) => updateForm("date", t)}
        style={styles.input}
      />
      <TextInput
        placeholder="Distance (km)"
        keyboardType="numeric"
        value={form.distance}
        onChangeText={(t) => updateForm("distance", t)}
        style={styles.input}
      />
      <TextInput
        placeholder="Duration (mm:ss)"
        value={form.duration}
        onChangeText={(t) => updateForm("duration", t)}
        style={styles.input}
      />
      <TextInput
        placeholder="Notes (optional)"
        value={form.notes}
        onChangeText={(t) => updateForm("notes", t)}
        style={[styles.input, { height: 80 }]}
        multiline
      />

      <TouchableOpacity onPress={addRun} style={styles.button} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Adding..." : "Add Run"}</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { marginTop: 20 }]}>Your Runs</Text>
      <FlatList
        data={runs}
        renderItem={({ item }) => (
          <View style={styles.runItem}>
            <Text style={styles.runText}>{item.id}</Text>
          </View>
        )}
        keyExtractor={(r, i) => r.id + i}
        ListEmptyComponent={<Text style={{ color: "#666" }}>No runs yet — add your first one above.</Text>}
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
