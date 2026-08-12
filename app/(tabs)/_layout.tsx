import { Redirect, Slot } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { useSessionStore } from '../../src/state/session';

export default function TabsLayout() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);

  if (hydrated && !isAuthenticated) {
    return <Redirect href="/phone" />;
  }

  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}
