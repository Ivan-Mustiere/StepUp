import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { colors, fontSize, spacing, radius } from "../styles";

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
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  danger: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.white,
  },
  text_secondary: {
    color: colors.textSecondary,
  },
  text_danger: {
    color: colors.error,
  },
  textDisabled: {
    opacity: 0.7,
  },
});
