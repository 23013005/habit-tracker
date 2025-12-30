import AsyncStorage from "@react-native-async-storage/async-storage";

const HABITS_KEY = "@habits";

export async function saveHabits(data: any) {
  try {
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save habits", e);
  }
}

export async function loadHabits() {
  try {
    const raw = await AsyncStorage.getItem(HABITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load habits", e);
    return [];
  }
}
