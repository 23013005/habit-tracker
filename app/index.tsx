import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../src/context/ThemeContext";

/* ===================== ENV ===================== */

const isExpoGo = Constants.appOwnership === "expo";

/* ===================== NOTIFICATION HANDLER ===================== */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/* ===================== TYPES ===================== */

type Habit = {
  id: string;
  title: string;
  completed: boolean;
};

type ProgressDay = {
  date: string;
  completed: number;
  total: number;
};

type Period = "daily" | "weekly" | "monthly";

type ReminderState = {
  enabled: boolean;
};

/* ===================== HELPERS ===================== */

const todayString = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toLocaleDateString("en-CA");
};

function getDayLabel(dateStr: string) {
  return new Date(dateStr).getDate().toString();
}

function getMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short" });
}

/* ===================== COMPONENT ===================== */

export default function Home() {
  const { colors, toggleTheme, theme } = useTheme();

  const weeklyScrollRef = useRef<ScrollView | null>(null);
  const monthlyScrollRef = useRef<ScrollView | null>(null);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const [progress, setProgress] = useState<ProgressDay[]>([]);
  const [period, setPeriod] = useState<Period>("daily");
  const [lastDate, setLastDate] = useState(todayString());

  const [reminder, setReminder] = useState<ReminderState>({
    enabled: false,
  });

  /* ===================== LOAD / SAVE ===================== */

  useEffect(() => {
    loadData();
    loadReminder();
    setupNotificationChannel();
  }, []);

  

  useEffect(() => {
    saveData();
  }, [habits, progress, lastDate]);

  async function setupNotificationChannel() {
    if (isExpoGo) return;

    await Notifications.setNotificationChannelAsync("habit-reminder", {
      name: "Habit Reminder",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  async function loadData() {
    const h = await AsyncStorage.getItem("habits");
    const p = await AsyncStorage.getItem("progress");
    const d = await AsyncStorage.getItem("lastDate");

    let loadedHabits: Habit[] = h ? JSON.parse(h) : [];
    let loadedProgress: ProgressDay[] = p ? JSON.parse(p) : [];
    const storedDate = d || todayString();

    if (storedDate !== todayString()) {
      loadedProgress.push({
        date: storedDate,
        completed: loadedHabits.filter(h => h.completed).length,
        total: loadedHabits.length,
      });

      loadedHabits = loadedHabits.map(h => ({ ...h, completed: false }));
      setLastDate(todayString());
    }

    if (!loadedProgress.find(p => p.date === todayString())) {
      loadedProgress.push({
        date: todayString(),
        completed: loadedHabits.filter(h => h.completed).length,
        total: loadedHabits.length,
      });
    }

    setHabits(loadedHabits);
    setProgress(loadedProgress);
  }

  async function saveData() {
    await AsyncStorage.setItem("habits", JSON.stringify(habits));
    await AsyncStorage.setItem("progress", JSON.stringify(progress));
    await AsyncStorage.setItem("lastDate", lastDate);
  }

  /* ===================== REMINDER (INTERVAL) ===================== */

  async function loadReminder() {
    const stored = await AsyncStorage.getItem("intervalReminder");
    if (!stored) return;

    const parsed: ReminderState = JSON.parse(stored);
    setReminder(parsed);
  }

  async function toggleIntervalReminder(value: boolean) {
  setReminder({ enabled: value });

  await AsyncStorage.setItem(
    "intervalReminder",
    JSON.stringify({ enabled: value })
  );

  if (isExpoGo) return;

  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return;

  // Always clean old schedules to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!value) return;

  await Notifications.scheduleNotificationAsync({
    identifier: "habit_interval_reminder",
    content: {
      title: "Habit Reminder",
      body: "Don't forget to check your habits 👀",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 4 * 60 * 60, // every 4 hours
      repeats: true,
    },
  });
}


async function scheduleNextReminder() {
  const reminderId = "habit_interval_reminder";

  const triggerTime = new Date(Date.now() + 15 * 1000); // 15 seconds test

  await Notifications.scheduleNotificationAsync({
    identifier: reminderId,
    content: {
      title: "Habit Reminder",
      body: "Don't forget to check your habits 👀",
    },
    trigger: {
  type: Notifications.SchedulableTriggerInputTypes.DATE,
  date: triggerTime,
},
 
  });
}



  /* ===================== HABITS ===================== */

  function syncTodayProgress(updatedHabits: Habit[]) {
    const completed = updatedHabits.filter(h => h.completed).length;

    setProgress(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(p => p.date === todayString());

      const today = {
        date: todayString(),
        completed,
        total: updatedHabits.length,
      };

      if (idx !== -1) copy[idx] = today;
      else copy.push(today);

      return copy;
    });
  }

  function addHabit() {
    if (!newHabit.trim()) return;

    const updated = [
      ...habits,
      { id: Date.now().toString(), title: newHabit, completed: false },
    ];

    setHabits(updated);
    syncTodayProgress(updated);
    setNewHabit("");
  }

  function toggleHabit(id: string) {
    const updated = habits.map(h =>
      h.id === id ? { ...h, completed: !h.completed } : h
    );

    setHabits(updated);
    syncTodayProgress(updated);
  }

  function startEdit(habit: Habit) {
    setEditingId(habit.id);
    setEditingText(habit.title);
  }

  function saveEdit() {
    if (!editingId || !editingText.trim()) return;

    const updated = habits.map(h =>
      h.id === editingId ? { ...h, title: editingText } : h
    );

    setHabits(updated);
    syncTodayProgress(updated);
    cancelEdit();
  }

  function deleteHabit(id: string) {
    const updated = habits.filter(h => h.id !== id);
    setHabits(updated);
    syncTodayProgress(updated);
    cancelEdit();
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText("");
  }

  /* ===================== PROGRESS ===================== */

  const completedToday = habits.filter(h => h.completed).length;
  const totalHabits = habits.length;

  const weeklyData = useMemo(() => buildRange(7), [progress, totalHabits]);
  const monthlyData = useMemo(() => buildRange(30), [progress, totalHabits]);

  function buildRange(days: number): ProgressDay[] {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      d.setHours(0, 0, 0, 0);

      const dateStr = d.toLocaleDateString("en-CA");
      const stored = progress.find(p => p.date === dateStr);

      return {
        date: dateStr,
        completed: stored?.completed ?? 0,
        total: stored?.total ?? totalHabits,
      };
    });
  }

  /* ===================== RENDERERS ===================== */

  function renderDailySegments() {
    const percent =
      totalHabits === 0
        ? 0
        : Math.round((completedToday / totalHabits) * 100);

    return (
      <>
        <View style={styles.segmentRow}>
          {habits.map(h => (
            <View
              key={h.id}
              style={[
                styles.segment,
                {
                  backgroundColor: h.completed
                    ? colors.primary
                    : colors.border,
                },
              ]}
            />
          ))}
        </View>

        <Text style={{ color: colors.text, marginTop: 10 }}>
          {completedToday} / {totalHabits} habits completed ({percent}%)
        </Text>
      </>
    );
  }

  function renderBars(data: ProgressDay[], ref: any) {
    let lastMonth = "";

    const avgPercent =
      data.length === 0
        ? 0
        : Math.round(
            (data.reduce((a, d) => a + d.completed, 0) /
              Math.max(data.reduce((a, d) => a + d.total, 0), 1)) *
              100
          );

    return (
      <>
        <ScrollView
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: 10000, y: 0 }}
        >
          <View style={styles.weekContainer}>
            {data.map((day, index) => {
              const month = getMonthLabel(day.date);
              const showMonth = month !== lastMonth;
              lastMonth = month;

              return (
                <View key={index} style={styles.dayColumn}>
                  {showMonth && (
                    <Text style={[styles.monthLabel, { color: colors.text }]}>
                      {month}
                    </Text>
                  )}

                  <Text style={[styles.dayLabel, { color: colors.text }]}>
                    {getDayLabel(day.date)}
                  </Text>

                  <View style={styles.verticalSegments}>
                    {Array.from({ length: Math.max(day.total, 1) }).map(
                      (_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.verticalSegment,
                            {
                              backgroundColor:
                                i < day.completed
                                  ? colors.primary
                                  : colors.border,
                            },
                          ]}
                        />
                      )
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <Text style={{ color: colors.text, marginTop: 10 }}>
          Average completion: {avgPercent}%
        </Text>
      </>
    );
  }

  /* ===================== UI ===================== */

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Habit Tracker
        </Text>
        <TouchableOpacity onPress={toggleTheme}>
          <Text style={{ fontSize: 20 }}>
            {theme === "light" ? "🌙" : "☀"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HABITS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Habits
          </Text>

          <View style={styles.addRow}>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Add habit"
              placeholderTextColor="#888"
              value={newHabit}
              onChangeText={setNewHabit}
              onSubmitEditing={addHabit}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={addHabit}
            >
              <Text style={{ color: "#fff", fontSize: 22 }}>+</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={habits}
            keyExtractor={h => h.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View>
                <Pressable
                  onPress={() => toggleHabit(item.id)}
                  style={[
                    styles.habitCard,
                    {
                      borderColor: item.completed
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: colors.text, flex: 1 }}>
                    {item.title}
                  </Text>

                  <View style={styles.rightActions}>
                    {item.completed && (
                      <View
                        style={[
                          styles.checkCircle,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => startEdit(item)}
                      style={styles.moreBtn}
                    >
                      <Text style={{ fontSize: 20, color: colors.text }}>
                        ⋯
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>

                {editingId === item.id && (
                  <View
                    style={[
                      styles.editPanel,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <TextInput
                      style={[
                        styles.input,
                        {
                          color: colors.text,
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      value={editingText}
                      onChangeText={setEditingText}
                    />

                    <View style={styles.editActions}>
                      <TouchableOpacity onPress={saveEdit}>
                        <Text style={{ color: colors.primary }}>Save</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => deleteHabit(item.id)}>
                        <Text style={{ color: colors.danger }}>Delete</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={cancelEdit}>
                        <Text style={{ color: colors.text }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          />
        </View>

        {/* REMINDERS */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Reminders
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: colors.text, flex: 1 }}>
              Enable habit reminders (every 4 hours)
            </Text>
            <Switch
              value={reminder.enabled}
              onValueChange={toggleIntervalReminder}
            />
          </View>

          {isExpoGo && (
            <Text style={{ fontSize: 12, color: "#999", marginTop: 6 }}>
              Notifications do not work in Expo Go (SDK 53+)
            </Text>
          )}
        </View>

        {/* PROGRESS */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Progress
          </Text>

          <View style={styles.periodRow}>
            {[
              { key: "daily", label: "DAILY" },
              { key: "weekly", label: "7 DAYS" },
              { key: "monthly", label: "30 DAYS" },
            ].map(p => (
              <TouchableOpacity
                key={p.key}
                onPress={() => setPeriod(p.key as Period)}
                style={[
                  styles.periodBtn,
                  period === p.key && { backgroundColor: colors.primary },
                ]}
              >
                <Text style={{ color: period === p.key ? "#fff" : colors.text }}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {period === "daily" && renderDailySegments()}
          {period === "weekly" && renderBars(weeklyData, weeklyScrollRef)}
          {period === "monthly" && renderBars(monthlyData, monthlyScrollRef)}
        </View>
      </ScrollView>
    </View>
  );
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "700" },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  addRow: { flexDirection: "row", marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  rightActions: { flexDirection: "row", alignItems: "center" },
  moreBtn: { marginLeft: 8, paddingHorizontal: 6 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  editPanel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  periodRow: { flexDirection: "row", marginBottom: 12 },
  periodBtn: {
    flex: 1,
    padding: 10,
    marginHorizontal: 4,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentRow: { flexDirection: "row", gap: 6 },
  segment: { flex: 1, height: 16, borderRadius: 6 },
  weekContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingVertical: 12,
  },
  dayColumn: { alignItems: "center", marginHorizontal: 14 },
  verticalSegments: {
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  verticalSegment: { width: 22, height: 22, borderRadius: 6 },
  dayLabel: { fontSize: 13, marginBottom: 4 },
  monthLabel: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
});
