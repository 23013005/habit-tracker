import React from "react";
import { Text, View } from "react-native";
import { AppProvider } from "./src/context/AppContext";

export default function App() {
  return (
    <AppProvider>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Habit Tracker Ready</Text>
      </View>
    </AppProvider>
  );
}
