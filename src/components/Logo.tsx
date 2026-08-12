import { Image, StyleSheet, Text, View } from 'react-native';

const HEART_SVG = encodeURIComponent(`
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFB800"/>
      <stop offset="1" stop-color="#EF7C0D"/>
    </linearGradient>
    <linearGradient id="b" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFD54A"/>
      <stop offset="1" stop-color="#F36639"/>
    </linearGradient>
    <linearGradient id="c" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#EF7C0D"/>
      <stop offset="1" stop-color="#E11D48"/>
    </linearGradient>
    <linearGradient id="d" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#FFE27A"/>
      <stop offset="1" stop-color="#FFB800"/>
    </linearGradient>
  </defs>
  <path fill="url(#a)" d="M4 16.6 18.2 26.6 45.8 7v19.6L17.9 47.2 4 37.4z"/>
  <path fill="url(#b)" d="M60 37.1 45.8 26.6V7L60 16.8z"/>
  <path fill="url(#c)" d="m17.9 47.2 14 9.8 28.1-19.9-14.2-10.5z"/>
  <path fill="url(#d)" d="M4 16.6 17.9 7l14.4 9.6-14.2 10z"/>
</svg>
`);

const HEART_URI = `data:image/svg+xml;utf8,${HEART_SVG}`;

export function HeartMark({ size = 28 }: { size?: number }) {
  return (
    <Image
      accessibilityLabel="Feromeet"
      source={{ uri: HEART_URI }}
      style={{ width: size, height: size }}
    />
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brand}>
      {!compact && <Text style={styles.word}>FER</Text>}
      <HeartMark size={compact ? 22 : 30} />
      {!compact && <Text style={styles.word}>MEET</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  word: {
    color: '#151726',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.6,
    fontFamily: 'Golos Text',
  },
});
