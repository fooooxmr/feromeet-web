import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

export const DESKTOP_MIN = 900;

export function useIsDesktop() {
  const { width } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && width >= DESKTOP_MIN;
}
