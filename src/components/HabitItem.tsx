import { Pressable, Text } from "react-native";
import { ThemeType } from "../theme/theme";

type Props = {
  title: string;
  completed: boolean;
  onToggle: () => void;
  theme: ThemeType;
};

export default function HabitItem({
  title,
  completed,
  onToggle,
  theme,
}: Props) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        padding: 14,
        borderRadius: 10,
        backgroundColor: completed ? theme.primary : "#E5E7EB",
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          color: completed ? "#FFFFFF" : theme.text,
          fontSize: 16,
          textDecorationLine: completed ? "line-through" : "none",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
