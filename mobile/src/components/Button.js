import { StyleSheet, Text, TouchableOpacity } from "react-native";

export default function Button({ children, onPress, variant = "primary", disabled, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.btn, styles[variant], disabled && styles.disabled, style]}
    >
      <Text style={[styles.text, styles[`text_${variant}`], disabled && styles.textDisabled]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: "#2563eb",
  },
  secondary: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  danger: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  text_secondary: {
    color: "#334155",
  },
  text_danger: {
    color: "#dc2626",
  },
  textDisabled: {
    opacity: 0.7,
  },
});
