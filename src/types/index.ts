
// ─── Widget Types ─────────────────────────────────────────────────────────────

export type WidgetType =
  | 'today'
  | 'links'
  | 'memo'
  | 'photo-frame';

export interface WidgetSize {
  w: number;
  h: number;
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export type WidgetLayoutMode = 'desktop' | 'mobile';

// ─── per-Widget Config Interfaces ─────────────────────────────────────────────

export interface TodayWidgetConfig {
  city?: string;
  lat?: number;
  lon?: number;
}

export interface PhotoWidgetConfig {
  images?: string[];
  imageUrl?: string;
  autoplay?: boolean;
  interval?: number;
  shuffle?: boolean;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  folder?: string;
}

export type LinkItem = Bookmark;

export interface LinksWidgetConfig {
  title?: string;
  bookmarkIds?: string[];
  /** Legacy snapshot and backup migration entry; no longer written after normalization. */
  links?: LinkItem[];
  showLabels?: boolean;
  iconSize?: 'sm' | 'md' | 'lg';
}

export interface MemoWidgetConfig {
  content?: string;
  bgColor?: string;
  textColor?: string;
}

/**
 * WidgetConfig
 * Loose configuration type for edit forms and generic update scenarios.
 */
export type WidgetConfig =
  Partial<TodayWidgetConfig> &
  Partial<PhotoWidgetConfig> &
  Partial<MemoWidgetConfig> &
  Partial<LinksWidgetConfig>;

/**
 * WidgetConfigMap
 * Maps each widget type to its specific config structure.
 */
export interface WidgetConfigMap {
  today: TodayWidgetConfig;
  links: LinksWidgetConfig;
  memo: MemoWidgetConfig;
  'photo-frame': PhotoWidgetConfig;
}

export type WidgetConfigByType<T extends WidgetType> = WidgetConfigMap[T];

interface BaseWidget<T extends WidgetType> {
  id: string;
  type: T;
  size: WidgetSize;
  position: WidgetPosition;
  config: WidgetConfigByType<T>;
}

/**
 * Widget
 * Binds type and config via discriminated union.
 */
export type Widget = {
  [T in WidgetType]: BaseWidget<T>;
}[WidgetType];

export type WidgetOfType<T extends WidgetType> = Extract<Widget, { type: T }>;

export type WidgetLayout = Omit<Widget, 'config'>;

export type WidgetLayoutsByMode = Record<WidgetLayoutMode, WidgetLayout[]>;

export type WidgetConfigEntry = {
  [T in WidgetType]: {
    id: string;
    type: T;
    config: WidgetConfigByType<T>;
  };
}[WidgetType];

export interface WidgetSnapshot {
  schemaVersion: 2;
  revision: number;
  layoutsByMode: WidgetLayoutsByMode;
  configs: WidgetConfigEntry[];
  bookmarks: Bookmark[];
}

// ─── Settings Interface ───────────────────────────────────────────────────────

export interface Settings {
  backgroundImage: string;
  backgroundBlur: number;
  backgroundOpacity: number;
  backgroundSize: string;
  backgroundRepeat: string;
  customFavicon: string;
  customTitle: string;
  language: string;
}

export const DEFAULT_SETTINGS: Settings = {
  backgroundImage: 'radial-gradient(#d1d5db 2px, transparent 2px)',
  backgroundBlur: 0,
  backgroundOpacity: 0,
  backgroundSize: '24px 24px',
  backgroundRepeat: 'repeat',
  customFavicon: '/favicon.svg',
  customTitle: 'Navidash',
  language: 'en',
};
