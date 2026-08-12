import { Redirect, Slot } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { useSessionStore } from '../../src/state/session';

export default function TabsLayout() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const registrationStatus = useSessionStore((state) => state.registrationStatus);
  const demoMode = useSessionStore((state) => state.demoMode);

  if (hydrated && !isAuthenticated) {
    return <Redirect href="/phone" />;
  }
  if (hydrated && !demoMode && registrationStatus === 'PROFILE_REQUIRED') {
    return <Redirect href="/onboarding" />;
  }

  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}
