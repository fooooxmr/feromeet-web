import { Redirect } from 'expo-router';
import { ScreenState } from '../src/components/ui';
import { useSessionStore } from '../src/state/session';

export default function Index() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);

  if (!hydrated) {
    return <ScreenState kind="loading" title="Открываем Feromeet" message="Восстанавливаем вашу сессию…" />;
  }

  return <Redirect href={isAuthenticated ? '/swipes' : '/phone'} />;
}
