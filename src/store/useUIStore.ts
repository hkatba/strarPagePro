import { create } from 'zustand';
import { WidgetLayoutMode } from '@/types';

/**
 * UIState Interface
 * Global UI state management
 */
interface UIState {
  isEditing: boolean; // Whether edit mode is active (controls drag-and-drop and edit button visibility)
  toggleEditing: () => void;
  setEditing: (isEditing: boolean) => void;
  currentCanvasCols: number;
  setCurrentCanvasCols: (cols: number) => void;
  editingLayoutMode: WidgetLayoutMode;
  setEditingLayoutMode: (mode: WidgetLayoutMode) => void;
  isLauncherOpen: boolean;
  openLauncher: () => void;
  closeLauncher: () => void;
  isBookmarksOpen: boolean;
  openBookmarks: () => void;
  closeBookmarks: () => void;
  toggleBookmarks: () => void;
  isSettingsOpen: boolean; // Global settings modal visibility state
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
}

/**
 * useUIStore
 * Centrally manages application UI interaction state
 */
export const useUIStore = create<UIState>((set) => ({
  isEditing: false,
  toggleEditing: () =>
    set((state) => ({
      isEditing: !state.isEditing,
      isBookmarksOpen: false,
    })),
  setEditing: (isEditing) => set({ isEditing }),
  currentCanvasCols: 8,
  setCurrentCanvasCols: (currentCanvasCols) => set({ currentCanvasCols }),
  editingLayoutMode: 'desktop',
  setEditingLayoutMode: (editingLayoutMode) => set({ editingLayoutMode }),
  isLauncherOpen: false,
  openLauncher: () => set({ isLauncherOpen: true, isBookmarksOpen: false }),
  closeLauncher: () => set({ isLauncherOpen: false }),
  isBookmarksOpen: false,
  openBookmarks: () => set({ isBookmarksOpen: true, isLauncherOpen: false }),
  closeBookmarks: () => set({ isBookmarksOpen: false }),
  toggleBookmarks: () =>
    set((state) => ({
      isBookmarksOpen: !state.isBookmarksOpen,
      isLauncherOpen: false,
    })),
  isSettingsOpen: false,
  openSettings: () => set({ isSettingsOpen: true, isBookmarksOpen: false }),
  closeSettings: () => set({ isSettingsOpen: false }),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
}));
