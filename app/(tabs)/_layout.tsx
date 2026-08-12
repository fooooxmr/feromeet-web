import { Redirect, Slot } from 'expo-router';
import { needsProfile } from '../../src/domain/models';
import { useSessionStore } from '../../src/state/session';

export default function TabsLayout() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const registrationStatus = useSessionStore((state) => state.registrationStatus);
  const demoMode = useSessionStore((state) => state.demoMode);

  if (hydrated && !isAuthenticated) {
    return <Redirect href="/phone" />;
  }
  if (hydrated && !demoMode && needsProfile(registrationStatus)) {
    return <Redirect href="/onboarding" />;
  }

  return <Slot />;
}
