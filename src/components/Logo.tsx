import { createElement, useId } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

const PATHS = [
  { fill: 'a', d: 'M4 16.6 18.2 26.6 45.8 7v19.6L17.9 47.2 4 37.4z' },
  { fill: 'b', d: 'M60 37.1 45.8 26.6V7L60 16.8z' },
  { fill: 'c', d: 'm17.9 47.2 14 9.8 28.1-19.9-14.2-10.5z' },
  { fill: 'd', d: 'M4 16.6 17.9 7l14.4 9.6-14.2 10z' },
] as const;

const STOPS = {
  a: ['#FFB800', '#EF7C0D'],
  b: ['#FFD54A', '#F36639'],
  c: ['#EF7C0D', '#E11D48'],
  d: ['#FFE27A', '#FFB800'],
} as const;

export function HeartMark({ size = 28, label }: { size?: number; label?: string }) {
  const uid = useId().replace(/:/g, '');
  if (Platform.OS === 'web') {
    return createElement(
      'span',
      { style: { position: 'relative', width: size, height: size, display: 'inline-flex', flexShrink: 0 } },
      createElement(
        'svg',
        { viewBox: '0 0 64 64', width: size, height: size, 'aria-hidden': true },
        createElement(
          'defs',
          null,
          ...Object.entries(STOPS).map(([id, [start, end]]) =>
            createElement(
              'linearGradient',
              { key: id, id: `${uid}-${id}`, x1: '0', y1: '0', x2: '1', y2: '1' },
              createElement('stop', { offset: '0', stopColor: start }),
              createElement('stop', { offset: '1', stopColor: end }),
            ),
          ),
        ),
        ...PATHS.map((path) =>
          createElement('path', {
            key: path.fill,
            fill: `url(#${uid}-${path.fill})`,
            d: path.d,
          }),
        ),
      ),
      label
        ? createElement(
            'span',
            {
              style: {
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: Math.round(size * 0.26),
                letterSpacing: 0.4,
                fontFamily: 'Golos Text, system-ui, sans-serif',
              },
            },
            label,
          )
        : null,
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.72, height: size * 0.72, borderRadius: 8, backgroundColor: '#EF7C0D' }} />
      {label ? <Text style={styles.go}>{label}</Text> : null}
    </View>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brand} accessibilityRole="image" accessibilityLabel="Feromeet">
      {!compact && <Text style={styles.word}>FER</Text>}
      <HeartMark size={compact ? 22 : 28} />
      {!compact && <Text style={[styles.word, styles.meet]}>MEET</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  word: {
    color: '#151726',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontFamily: 'Golos Text',
  },
  meet: { marginLeft: -1 },
  go: {
    position: 'absolute',
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
  },
});
