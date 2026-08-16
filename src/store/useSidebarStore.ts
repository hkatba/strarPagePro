import { create } from 'zustand';

/**
 * SidebarState Interface
 * Sidebar state management (Overlay mode, hidden by default)
 */
export interface SidebarState {
  isOpen: boolean;
  selectedCategoryId: string | null;
  toggle: () => void;
  close: () => void;
  open: () => void;
  setSelectedCategoryId: (id: string | null) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false, // Collapsed by default
  selectedCategoryId: null,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  close: () => set({ isOpen: false }),
  open: () => set({ isOpen: true }),
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
}));
