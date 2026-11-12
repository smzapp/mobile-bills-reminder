import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <AppText variant="label" color={Colors.textSecondary}>
        {label}
      </AppText>
      {children}
      {error ? (
        <AppText variant="caption" color={Colors.danger}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color={Colors.textSecondary}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string | null;
  prefix?: string;
  multiline?: boolean;
}

export function TextField({ label, hint, error, prefix, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} hint={hint} error={error}>
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
          inputProps.multiline && styles.inputWrapperMultiline,
        ]}>
        {prefix ? (
          <AppText variant="subtitle" color={Colors.textSecondary}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          {...inputProps}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          placeholderTextColor={Colors.textTertiary}
          style={[styles.input, inputProps.multiline && styles.inputMultiline]}
        />
      </View>
    </Field>
  );
}

export interface ValueFieldProps {
  label: string;
  value: string;
  icon?: string;
  placeholder?: string;
  onPress: () => void;
  error?: string | null;
}

/** A read-only row that opens a picker (date, time, category, ringtone). */
export function ValueField({
  label,
  value,
  icon,
  placeholder,
  onPress,
  error,
}: ValueFieldProps) {
  const empty = value.length === 0;
  return (
    <Field label={label} error={error}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.inputWrapper,
          error ? styles.inputWrapperError : null,
          pressed && styles.pressed,
        ]}>
        {icon ? <Icon name={icon} size={18} color={Colors.textSecondary} /> : null}
        <AppText
          variant="bodyStrong"
          color={empty ? Colors.textTertiary : Colors.textPrimary}
          style={styles.valueText}>
          {empty ? (placeholder ?? 'Select') : value}
        </AppText>
        <Icon name="chevron-right" size={18} color={Colors.textTertiary} />
      </Pressable>
    </Field>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg - 2,
    minHeight: 52,
  },
  inputWrapperMultiline: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    minHeight: 96,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
  },
  inputWrapperError: {
    borderColor: Colors.danger,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  valueText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
