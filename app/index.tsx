import { Redirect } from 'expo-router';
import { ScreenState } from '../src/components/ui';
import { needsProfile } from '../src/domain/models';
import { useSessionStore } from '../src/state/session';

export default function Index() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const registrationStatus = useSessionStore((state) => state.registrationStatus);
  const demoMode = useSessionStore((state) => state.demoMode);

  if (!hydrated) {
    return <ScreenState kind="loading" title="Открываем Feromeet" message="Восстанавливаем вашу сессию…" />;
  }

  if (!isAuthenticated) return <Redirect href="/phone" />;
  if (!demoMode && needsProfile(registrationStatus)) return <Redirect href="/onboarding" />;
  return <Redirect href="/swipes" />;
}
