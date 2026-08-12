import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { colors, gradient, radius, shadow, spacing, type } from '../theme/tokens';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brand}>
      <View style={styles.brandGlyph}>
        <Text style={styles.brandHeart}>♥</Text>
      </View>
      {!compact && (
        <Text style={styles.brandText}>
          FER <Text style={styles.brandAccent}>MEET</Text>
        </Text>
      )}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? gradient : styles[`button_${variant}`],
        (pressed || disabled) && styles.buttonDimmed,
      ]}
    >
      <Text style={[styles.buttonText, variant !== 'primary' && styles.buttonTextDark]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.field, props.multiline && styles.fieldMultiline]}
        {...props}
      />
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({
  name,
  size = 52,
  uri,
}: {
  name: string;
  size?: number;
  uri?: string;
}) {
  if (uri) {
    return (
      <Image
        accessibilityLabel={name}
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>
        {name.slice(0, 1)}
      </Text>
    </View>
  );
}

export function Page({
  eyebrow,
  title,
  subtitle,
  action,
  children,
}: PropsWithChildren<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}>) {
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <View style={styles.pageHeading}>
          {eyebrow && <Text style={type.eyebrow}>{eyebrow}</Text>}
          <Text style={type.title}>{title}</Text>
          {subtitle && <Text style={type.subtitle}>{subtitle}</Text>}
        </View>
        {action}
      </View>
      {children}
    </ScrollView>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function ScreenState({
  kind,
  title,
  message,
  action,
}: {
  kind: 'loading' | 'empty' | 'error';
  title: string;
  message: string;
  action?: () => void;
}) {
  return (
    <View style={styles.state}>
      {kind === 'loading' ? (
        <ActivityIndicator color={colors.berry} size="large" />
      ) : (
        <Text style={styles.stateIcon}>{kind === 'empty' ? '◇' : '!'}</Text>
      )}
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {action && <Button label="Попробовать снова" variant="secondary" onPress={action} />}
    </View>
  );
}

export function Sheet({
  visible,
  title,
  onClose,
  children,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
}>) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable accessibilityLabel="Закрыть" onPress={onClose}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandGlyph: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...gradient,
  },
  brandHeart: { color: colors.surface, fontWeight: '900', fontSize: 16 },
  brandText: { color: colors.ink, fontSize: 20, fontWeight: '900', letterSpacing: 1.4 },
  brandAccent: { color: colors.berry },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.berry,
  },
  button_secondary: { backgroundColor: colors.soft },
  button_ghost: { backgroundColor: '#F4F6F8' },
  button_danger: { backgroundColor: '#FDECEC' },
  buttonDimmed: { opacity: 0.62 },
  buttonText: { color: colors.surface, fontWeight: '800', fontSize: 15 },
  buttonTextDark: { color: colors.ink },
  fieldWrap: { gap: 7 },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  field: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  fieldMultiline: { minHeight: 104, paddingTop: 14, textAlignVertical: 'top' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.berry, borderColor: colors.berry },
  chipText: { color: colors.berryDark, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: colors.surface },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft },
  avatarText: { color: colors.berryDark, fontWeight: '900' },
  page: { width: '100%', maxWidth: 1080, alignSelf: 'center', padding: spacing.lg, gap: spacing.lg },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  pageHeading: { flex: 1, gap: 7 },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  state: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  stateIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.soft,
    color: colors.berry,
    textAlign: 'center',
    lineHeight: 54,
    fontSize: 28,
    fontWeight: '800',
  },
  stateTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: 6 },
  stateMessage: { color: colors.muted, textAlign: 'center', lineHeight: 21, maxWidth: 390 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 18, 24, 0.46)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  sheet: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    backgroundColor: colors.line,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  close: { color: colors.muted, fontSize: 32, lineHeight: 34 },
});
