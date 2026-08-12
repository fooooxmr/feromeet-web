import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BrandMark, Button, Field } from '../../components/ui';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
import { authApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { needsProfile } from '../../domain/models';
import { useSessionStore } from '../../state/session';

export function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'registration'>('login');
  const [error, setError] = useState('');
  const setPhoneNumber = useSessionStore((state) => state.setPhoneNumber);
  const enterDemo = useSessionStore((state) => state.enterDemo);
  const digits = phone.replace(/\D/g, '');
  const valid = digits.length >= 10;

  const requestCode = async () => {
    setBusy(true);
    setError('');
    setPhoneNumber(phone);
    try {
      await authApi.requestSms(phone, mode);
      router.push({ pathname: '/otp', params: { phone, mode } });
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Не удалось отправить код. Попробуйте ещё раз.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame
      title="Вход по SMS"
      subtitle="Оставьте номер — пришлём короткий код."
    >
      <View style={styles.modeRow}>
        <Pressable
          onPress={() => setMode('login')}
          style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
        >
          <Text style={[styles.modeText, mode === 'login' && styles.modeTextActive]}>Войти</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('registration')}
          style={[styles.modeButton, mode === 'registration' && styles.modeButtonActive]}
        >
          <Text style={[styles.modeText, mode === 'registration' && styles.modeTextActive]}>Создать аккаунт</Text>
        </Pressable>
      </View>
      <Field
        label="Номер телефона"
        autoComplete="tel"
        keyboardType="phone-pad"
        placeholder="+375 29 000-00-00"
        value={phone}
        onChangeText={setPhone}
      />
      <Button
        disabled={!valid || busy}
        label={busy ? 'Отправляем…' : 'Получить код'}
        onPress={() => void requestCode()}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button
        label="Посмотреть demo"
        variant="secondary"
        onPress={() => {
          enterDemo();
          router.replace('/swipes');
        }}
      />
      <Text style={styles.legal}>
        Продолжая, вы принимаете условия сервиса и политику конфиденциальности.
      </Text>
    </AuthFrame>
  );
}

export function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; mode?: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<TextInput>(null);
  const storedPhone = useSessionStore((state) => state.phoneNumber);
  const setTokens = useSessionStore((state) => state.setTokens);
  const phone = params.phone ?? storedPhone ?? '';
  const mode = params.mode === 'registration' ? 'registration' : 'login';

  const login = async () => {
    setBusy(true);
    setError('');
    try {
      const tokens =
        mode === 'registration'
          ? await authApi.registerWithSms(phone, code)
          : await authApi.loginWithSms(phone, code);
      await setTokens(tokens);
      router.replace(needsProfile(tokens.registrationStatus) ? '/onboarding' : '/swipes');
    } catch (loginError) {
      setError(
        loginError instanceof ApiError
          ? loginError.message
          : 'Код не принят. Проверьте цифры и повторите.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame
      title="Введите код"
      subtitle="Мы отправили четыре цифры по SMS."
    >
      <Pressable onPress={() => input.current?.focus()} style={styles.codeRow}>
        {[0, 1, 2, 3].map((index) => (
          <View key={index} style={[styles.codeBox, code.length === index && styles.codeBoxFocused]}>
            <Text style={styles.codeDigit}>{code[index] ?? ''}</Text>
          </View>
        ))}
        <TextInput
          ref={input}
          autoFocus
          keyboardType="number-pad"
          maxLength={4}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          style={styles.hiddenInput}
        />
      </Pressable>
      <Button
        disabled={code.length !== 4 || busy}
        label={busy ? 'Проверяем…' : 'Продолжить'}
        onPress={() => void login()}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.resendRow}>
        <Text style={styles.resendHint}>Не пришёл код?</Text>
        <Pressable onPress={() => void authApi.requestSms(phone, mode)}>
          <Text style={styles.resend}>Отправить снова</Text>
        </Pressable>
      </View>
      <Button label="Изменить номер" variant="ghost" onPress={() => router.back()} />
    </AuthFrame>
  );
}

function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.formCard}>
        <BrandMark />
        <View style={styles.heading}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.form}>{children}</View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  formCard: {
    width: '100%',
    maxWidth: 440,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.xl,
    ...shadow,
  },
  heading: { gap: spacing.sm },
  title: { color: colors.ink, fontWeight: '900', fontSize: 30, letterSpacing: -0.7 },
  subtitle: { color: colors.muted, lineHeight: 22 },
  form: { gap: spacing.md },
  modeRow: { flexDirection: 'row', borderRadius: radius.pill, backgroundColor: colors.soft, padding: 4 },
  modeButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: radius.pill, alignItems: 'center' },
  modeButtonActive: { backgroundColor: colors.surface, ...shadow },
  modeText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  modeTextActive: { color: colors.berryDark },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  legal: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 16 },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  codeBox: {
    width: 58,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFocused: { borderColor: colors.berry, borderWidth: 2 },
  codeDigit: { color: colors.ink, fontSize: 25, fontWeight: '900' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  resendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  resendHint: { color: colors.muted, fontSize: 13 },
  resend: { color: colors.berry, fontSize: 13, fontWeight: '800' },
});
