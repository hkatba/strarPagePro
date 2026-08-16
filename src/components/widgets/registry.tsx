/**
 * Widget Registry
 *
 * Centrally manages all widgets':
 *  1. Render components (used by MainCanvas)
 *  2. Component library metadata (used by WidgetStoreSidebar)
 *
 * When adding a new widget type, simply add a record in this file,
 * without needing to modify MainCanvas or the widget store implementation.
 */

import React from 'react';
import {
  LayoutGrid,
  Image as ImageIcon,
  StickyNote,
  PanelTop,
  type LucideIcon,
} from 'lucide-react';
import { Widget, WidgetType } from '@/types';

import LinksWidget from './LinksWidget';
import MemoWidget from './MemoWidget';
import PhotoWidget from './PhotoWidget';
import TodayWidget from './TodayWidget';

// ─── Render Component Mappings ────────────────────────────────────────────────

/**
 * Unified registry for current components.
 */
type WidgetRenderer = React.ComponentType<{ widget: Widget }>;

export const widgetComponentRegistry: Partial<Record<WidgetType, WidgetRenderer>> = {
  today: TodayWidget as WidgetRenderer,
  links: LinksWidget as WidgetRenderer,
  memo: MemoWidget as WidgetRenderer,
  'photo-frame': PhotoWidget as WidgetRenderer,
};

// ─── Component Library Metadata ───────────────────────────────────────────────

export interface WidgetMeta {
  type: WidgetType;
  /** next-intl translation key (corresponds to Widgets namespace) */
  titleKey: string;
  descKey: string;
  /** Lucide icon component */
  Icon: LucideIcon;
  iconClassName: string;
  defaultSize: { w: number; h: number };
}

export const widgetMeta: WidgetMeta[] = [
  {
    type: 'links',
    titleKey: 'links',
    descKey: 'links_desc',
    Icon: LayoutGrid,
    iconClassName: 'text-violet-500',
    defaultSize: { w: 2, h: 1 },
  },
  {
    type: 'today',
    titleKey: 'today',
    descKey: 'today_desc',
    Icon: PanelTop,
    iconClassName: 'text-sky-600',
    defaultSize: { w: 2, h: 2 },
  },
  {
    type: 'memo',
    titleKey: 'memo',
    descKey: 'memo_desc',
    Icon: StickyNote,
    iconClassName: 'text-amber-500',
    defaultSize: { w: 2, h: 1 },
  },
  {
    type: 'photo-frame',
    titleKey: 'photo_frame',
    descKey: 'photo_frame_desc',
    Icon: ImageIcon,
    iconClassName: 'text-pink-500',
    defaultSize: { w: 2, h: 2 },
  },
];

export const widgetTypesRequiringSetup: WidgetType[] = [
  'today',
  'photo-frame',
  'links',
];
