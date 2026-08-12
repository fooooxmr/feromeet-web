import type { PropsWithChildren, ReactNode } from 'react';
import { createElement, forwardRef, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { formatTag, type TagView } from '../domain/tags';
import { colors, fontFamily, gradient, radius, shadow, spacing, type } from '../theme/tokens';
import { useIsDesktop } from '../theme/layout';

export { BrandMark, HeartMark } from './Logo';

export const Button = forwardRef<View, {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
}>(function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  ...rest
}, ref) {
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? gradient : styles[`button_${variant}`],
        (pressed || disabled) && styles.buttonDimmed,
      ]}
      {...rest}
    >
      <Text style={[styles.buttonText, variant !== 'primary' && styles.buttonTextDark]}>
        {label}
      </Text>
    </Pressable>
  );
});

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

export function SliderField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (next: number) => void;
}) {
  const track = useRef<View>(null);
  const [width, setWidth] = useState(1);
  const ratio = Math.max(0, Math.min(1, (value - min) / Math.max(1, max - min)));

  const updateFromPageX = (pageX: number) => {
    track.current?.measure((_x, _y, measuredWidth, _h, left) => {
      const span = measuredWidth || width;
      const nextRatio = Math.max(0, Math.min(1, (pageX - left) / span));
      onChange(Math.round(min + nextRatio * (max - min)));
    });
  };

  return (
    <View style={styles.fieldWrap}>
      <View style={styles.sliderHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.sliderValue}>
          {value}
          {suffix ?? ''}
        </Text>
      </View>
      {Platform.OS === 'web'
        ? createElement('input', {
            type: 'range',
            min,
            max,
            value,
            'aria-label': label,
            onChange: (event: { target: { value: string } }) => onChange(Number(event.target.value)),
            style: {
              width: '100%',
              accentColor: colors.berry,
              height: 28,
              cursor: 'pointer',
            },
          })
        : (
          <View
            ref={track}
            accessibilityRole="adjustable"
            accessibilityLabel={label}
            accessibilityValue={{ min, max, now: value }}
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => updateFromPageX(event.nativeEvent.pageX)}
            onResponderMove={(event) => updateFromPageX(event.nativeEvent.pageX)}
            style={styles.sliderHit}
          >
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${ratio * 100}%` }]} />
            </View>
            <View style={[styles.sliderThumb, { left: `${ratio * 100}%` }]} />
          </View>
        )}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: string;
}) {
  const tag = /[_]|^(ferotag_|inter_|alco_|occup_|person_)/.test(label)
    ? formatTag(label)
    : undefined;
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {icon || tag ? `${icon ?? tag?.icon}  ${tag?.label || label}` : label}
      </Text>
    </Pressable>
  );
}

export function TagChip({
  tag,
  glass,
}: {
  tag: TagView;
  glass?: boolean;
}) {
  if (!tag.label) return null;
  return (
    <View style={[styles.tagChip, glass && styles.tagChipGlass]}>
      <Text style={[styles.tagChipText, glass && styles.tagChipTextGlass]}>
        {tag.icon}  {tag.label}
      </Text>
    </View>
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
      <Photo
        accessibilityLabel={name}
        uri={uri}
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

export function Photo({
  uri,
  style,
  accessibilityLabel,
}: {
  uri: string;
  style: object;
  accessibilityLabel?: string;
}) {
  const [ready, setReady] = useState(false);
  return (
    <View style={[styles.photoWrap, style]}>
      {!ready && (
        <View style={styles.photoLoader}>
          <ActivityIndicator color={colors.amber} />
        </View>
      )}
      <Image
        accessibilityLabel={accessibilityLabel}
        onLoad={() => setReady(true)}
        source={{ uri }}
        style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}
      />
    </View>
  );
}

export function Page({
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
  const desktop = useIsDesktop();
  return (
    <ScrollView
      contentContainerStyle={[styles.page, desktop && styles.pageDesktop]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <View style={styles.pageHeading}>
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
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.berry,
  },
  button_secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  button_ghost: { backgroundColor: 'transparent' },
  button_danger: { backgroundColor: '#FDECEC' },
  buttonDimmed: { opacity: 0.62 },
  buttonText: { color: colors.surface, fontWeight: '700', fontSize: 16, fontFamily },
  buttonTextDark: { color: colors.ink },
  fieldWrap: { gap: 7 },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '600', fontFamily },
  field: {
    minHeight: 50,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily,
  },
  fieldMultiline: { minHeight: 104, paddingTop: 14, textAlignVertical: 'top' },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderValue: { color: colors.berry, fontSize: 13, fontWeight: '700', fontFamily },
  sliderHit: { height: 28, justifyContent: 'center' },
  sliderTrack: { height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  sliderFill: { height: 4, backgroundColor: colors.berry },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    marginLeft: -10,
    borderRadius: 10,
    backgroundColor: colors.berry,
    top: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.berry, borderColor: colors.berry },
  chipText: { color: colors.ink, fontSize: 13, fontWeight: '600', fontFamily },
  chipTextActive: { color: colors.surface },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.soft,
  },
  tagChipGlass: { backgroundColor: 'rgba(255,255,255,0.22)' },
  tagChipText: { color: colors.berryDark, fontSize: 12, fontWeight: '600', fontFamily },
  tagChipTextGlass: { color: '#fff' },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft },
  avatarText: { color: colors.berryDark, fontWeight: '800', fontFamily },
  photoWrap: { overflow: 'hidden', backgroundColor: '#1A1714' },
  photoLoader: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  page: { width: '100%', padding: spacing.lg, gap: spacing.lg, paddingBottom: 28 },
  pageDesktop: { maxWidth: 980, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 24 },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  pageHeading: { flex: 1, gap: 4, minWidth: 0 },
  card: {
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  state: {
    flex: 1,
    minHeight: 280,
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
  stateTitle: { color: colors.ink, fontSize: 20, fontWeight: '700', marginTop: 6, fontFamily },
  stateMessage: { color: colors.muted, textAlign: 'center', lineHeight: 21, maxWidth: 320, fontFamily },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  sheet: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '92%',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
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
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: '700', fontFamily, flex: 1, paddingRight: 12 },
  close: { color: colors.muted, fontSize: 32, lineHeight: 34 },
});
