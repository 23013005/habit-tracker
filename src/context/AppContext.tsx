import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { loadHabits, saveHabits } from "../storage/storage";
import { ThemeType } from "../theme/theme";
import { useTheme } from "../theme/useTheme";

type Habit = {
  id: string;
  title: string;
  completedToday: boolean;
  lastCompletedDate: string | null; // YYYY-MM-DD
};

type AppContextType = {
  habits: Habit[];
  addHabit: (title: string) => void;
  toggleHabit: (id: string) => void;
  theme: ThemeType;
  setLight: () => void;
  setDark: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loaded, setLoaded] = useState(false);

  const { theme, setLight, setDark } = useTheme();

  // Load habits
  useEffect(() => {
    loadHabits().then((data: Habit[]) => {
      const today = todayString();

      // RESET LOGIC (IMPORTANT)
      const normalized = data.map((h) => ({
        ...h,
        completedToday: h.lastCompletedDate === today,
      }));

      setHabits(normalized);
      setLoaded(true);
    });
  }, []);

  // Save habits
  useEffect(() => {
    if (loaded) {
      saveHabits(habits);
    }
  }, [habits, loaded]);

  const addHabit = (title: string) => {
    setHabits((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title,
        completedToday: false,
        lastCompletedDate: null,
      },
    ]);
  };

  const toggleHabit = (id: string) => {
    const today = todayString();

    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;

        const newCompleted = !h.completedToday;

        return {
          ...h,
          completedToday: newCompleted,
          lastCompletedDate: newCompleted ? today : null,
        };
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
        habits,
        addHabit,
        toggleHabit,
        theme,
        setLight,
        setDark,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return ctx;
}
