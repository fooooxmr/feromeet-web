import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppShell } from '../src/components/AppShell';
import { colors } from '../src/theme/tokens';
import { useSessionStore } from '../src/state/session';

export default function RootLayout() {
  const hydrate = useSessionStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <>
      <StatusBar style="dark" />
      <AppShell>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { flex: 1, backgroundColor: colors.canvas },
          }}
        />
      </AppShell>
    </>
  );
}
