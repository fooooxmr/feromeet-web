import { create } from 'zustand';

interface ShellState {
  openFilters?: () => void;
  setOpenFilters: (openFilters?: () => void) => void;
}

export const useShellStore = create<ShellState>((set) => ({
  setOpenFilters: (openFilters) => set({ openFilters }),
}));
