'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { useWidgetStore } from '@/store/useWidgetStore';
import { useSidebarStore } from '@/store/useSidebarStore';
import { v4 as uuidv4 } from 'uuid';
import { buildPlacementResult, WidgetCreatedDetail, WidgetDropDetail } from '@/lib/widgetPlacement';
import { useTranslations } from 'next-intl';
import { widgetMeta, widgetTypesRequiringSetup } from '@/components/widgets/registry';

interface DroppableGridAreaProps {
  containerRef: React.RefObject<HTMLDivElement>;
  width: number;
  cols: number;
  rowHeight: number;
  margin: [number, number];
  onPreviewChange: (
    updates: Array<{ id: string; position: { x: number; y: number } }>
  ) => void;
  children: React.ReactNode;
}

/**
 * Drop indicator state
 */
interface DropIndicatorState {
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  isValid: boolean;
}

/**
 * DroppableGridArea
 * Droppable grid area overlaying the MainCanvas grid
 * 
 * Features:
 * 1. Real-time drop indicator display, dynamically adjusted to widget's actual size
 * 2. Controlled collision: previews widgets moving down within their columns
 * 3. Visual feedback: blue = valid placement, red = out of bounds or excessive impact
 * 4. Animation support: smooth transitions on widget position changes
 */
export default function DroppableGridArea({
  containerRef,
  width,
  cols,
  rowHeight,
  margin,
  onPreviewChange,
  children,
}: DroppableGridAreaProps) {
  const { widgets, addWidgetWithLayout } = useWidgetStore();
  const { close: closeSidebar } = useSidebarStore();
  const t = useTranslations('Widgets');
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState | null>(null);
  const dropIndicatorRef = useRef<HTMLDivElement>(null);
  const dropIndicatorRefLatest = useRef(dropIndicator);
  const widgetsRef = useRef(widgets);

  // Sync widgets to ref to avoid stale closures in event listeners
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  // Sync dropIndicator to ref
  useEffect(() => {
    dropIndicatorRefLatest.current = dropIndicator;
  }, [dropIndicator]);

  // Calculate cell dimensions
  const cellDimensions = useMemo(() => {
    const cellWidth = (width - (cols - 1) * margin[0]) / cols;
    const cellHeight = rowHeight;
    return { cellWidth, cellHeight };
  }, [width, cols, rowHeight, margin]);

  // Calculate grid position
  const calculateGridPosition = useCallback((
    clientX: number,
    clientY: number,
    widgetWidth: number,
    widgetHeight: number,
    anchor: 'top-left' | 'center' = 'top-left'
  ) => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const { cellWidth } = cellDimensions;
    const cellHeightWithMargin = rowHeight + margin[1];
    const widgetPixelWidth =
      cellWidth * widgetWidth + margin[0] * (widgetWidth - 1);
    const widgetPixelHeight =
      rowHeight * widgetHeight + margin[1] * (widgetHeight - 1);

    let relativeX = clientX - rect.left;
    let relativeY = clientY - rect.top;
    if (anchor === 'center') {
      // Use cursor point as widget center for calculation to avoid snapping purely from top-left
      relativeX -= widgetPixelWidth / 2;
      relativeY -= widgetPixelHeight / 2;
    }

    // Calculate grid position: nearest snap to reduce offset bias
    let gridX = Math.round(relativeX / (cellWidth + margin[0]));
    let gridY = Math.round(relativeY / cellHeightWithMargin);

    // Clamp within grid bounds
    gridX = Math.max(0, Math.min(gridX, cols - widgetWidth));
    gridY = Math.max(0, gridY);

    return { x: gridX, y: gridY };
  }, [containerRef, cols, cellDimensions, rowHeight, margin]);

  // Get DnD context
  const dndContext = useDndContext();
  const { active } = dndContext;
  const isDragging = !!active;
  const activeMeta = useMemo(() => {
    const activeType = active?.data.current?.type;
    return widgetMeta.find((item) => item.type === activeType);
  }, [active]);

  // Droppable area configuration
  const { setNodeRef } = useDroppable({
    id: 'main-canvas-drop-area',
    data: {
      type: 'grid-drop-area',
    },
  });

  // Handle drag move and update drop indicator
  useEffect(() => {
    if (!containerRef.current || !active) {
      setDropIndicator(null);
      onPreviewChange([]);
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const isInsideCanvas =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!isInsideCanvas) {
        setDropIndicator(null);
        onPreviewChange([]);
        return;
      }

      // Get widget dimensions from active data
      let widgetWidth = 2;
      let widgetHeight = 1;
      let activeWidgetType: string = 'links';

      if (active?.data.current) {
        const data = active.data.current as any;
        if (data.defaultSize) {
          widgetWidth = data.defaultSize.w;
          widgetHeight = data.defaultSize.h;
        }
        if (typeof data.type === 'string') {
          activeWidgetType = data.type;
        }
      }

      const position = calculateGridPosition(
        e.clientX,
        e.clientY,
        widgetWidth,
        widgetHeight,
        'center'
      );
      if (position) {
        const previewPlacement = buildPlacementResult({
          widgets: widgetsRef.current,
          widgetType: activeWidgetType as any,
          widgetId: 'temp-preview',
          defaultSize: { w: widgetWidth, h: widgetHeight },
          cols,
          preferredPosition: { x: position.x, y: position.y },
        });
        onPreviewChange(previewPlacement.isValid ? previewPlacement.positionUpdates : []);
        setDropIndicator({
          x: position.x,
          y: position.y,
          w: widgetWidth,
          h: widgetHeight,
          visible: true,
          isValid: previewPlacement.isValid,
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      onPreviewChange([]);
    };
  }, [active, calculateGridPosition, containerRef, cols, onPreviewChange]);

  // Handle drop event
  useEffect(() => {
    const handleDrop = (e: CustomEvent<WidgetDropDetail>) => {
      const { widgetType, defaultSize, dropClient, droppedOnGrid } = e.detail;

      if (!containerRef.current) return;

      const currentDropIndicator = dropIndicatorRefLatest.current;

      let position: { x: number; y: number } | undefined;
      const isDropClientInsideCanvas =
        !!dropClient &&
        (() => {
          const rect = containerRef.current!.getBoundingClientRect();
          return (
            dropClient.x >= rect.left &&
            dropClient.x <= rect.right &&
            dropClient.y >= rect.top &&
            dropClient.y <= rect.bottom
          );
        })();
      const shouldUsePreferredPosition =
        droppedOnGrid || isDropClientInsideCanvas || !!currentDropIndicator;

      // Prioritize real-time indicator to align drop placement with visual feedback
      if (shouldUsePreferredPosition && currentDropIndicator) {
        position = { x: currentDropIndicator.x, y: currentDropIndicator.y };
      } else if (shouldUsePreferredPosition && dropClient) {
        position = calculateGridPosition(
          dropClient.x,
          dropClient.y,
          defaultSize.w,
          defaultSize.h,
          'center'
        ) ?? undefined;
      }
      // Fall back to appending at the end when grid is missed or target point is indeterminate

      const placement = buildPlacementResult({
        widgets: widgetsRef.current,
        widgetType: widgetType as any,
        widgetId: uuidv4(),
        defaultSize,
        cols,
        preferredPosition: position,
        maxScanRows: shouldUsePreferredPosition ? 20 : 0,
      });

      if (
        !placement.isValid ||
        !addWidgetWithLayout(placement.newWidget, placement.positionUpdates)
      ) {
        setDropIndicator(null);
        onPreviewChange([]);
        return;
      }

      window.dispatchEvent(
        new CustomEvent<WidgetCreatedDetail>('widget-created', {
          detail: {
            widgetId: placement.newWidget.id,
            shouldOpenSettings: widgetTypesRequiringSetup.includes(placement.newWidget.type),
          },
        })
      );
      closeSidebar();
      // Switch focus to main canvas for keyboard/interaction continuity
      requestAnimationFrame(() => {
        const mainCanvas = document.querySelector('[data-main-canvas]');
        if (mainCanvas instanceof HTMLElement) {
          mainCanvas.focus();
        }
      });

      setDropIndicator(null);
      onPreviewChange([]);
    };

    window.addEventListener('widget-drop', handleDrop as EventListener);
    return () => window.removeEventListener('widget-drop', handleDrop as EventListener);
  }, [
    width,
    cols,
    addWidgetWithLayout,
    calculateGridPosition,
    containerRef,
    closeSidebar,
    onPreviewChange,
  ]);

  // Clear indicator when drag ends
  useEffect(() => {
    if (!isDragging) {
      setDropIndicator(null);
      onPreviewChange([]);
    }
  }, [isDragging, onPreviewChange]);

  return (
    <div className="relative w-full h-full">
      {/* Droppable area overlay */}
      <div
        ref={setNodeRef}
        data-grid-drop-area="true"
        className="absolute inset-0 z-10"
        style={{
          pointerEvents: isDragging ? 'auto' : 'none',
          backgroundColor: dropIndicator?.visible ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
          border: dropIndicator?.visible ? '1px dashed rgba(59, 130, 246, 0.2)' : 'none',
          borderRadius: '0.75rem',
        }}
      />

      {/* Drop indicator */}
      {dropIndicator?.visible && (
        <div
          ref={dropIndicatorRef}
          className="absolute z-20 pointer-events-none transition-all duration-150"
          style={{
            left: `${dropIndicator.x * (cellDimensions.cellWidth + margin[0])}px`,
            top: `${dropIndicator.y * (rowHeight + margin[1])}px`,
            width: `${cellDimensions.cellWidth * dropIndicator.w + margin[0] * (dropIndicator.w - 1)}px`,
            height: `${dropIndicator.h * rowHeight + (dropIndicator.h - 1) * margin[1]}px`,
          }}
        >
          <div
            className={`
              relative h-full w-full overflow-hidden rounded-[22px] border shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-4 backdrop-blur-sm
              ${dropIndicator.isValid
                ? 'border-blue-300/80 bg-white/82 ring-blue-100/80'
                : 'border-red-300/90 bg-white/84 ring-red-100/90'
              }
            `}
          >
            <div
              className={`
                absolute inset-0
                ${dropIndicator.isValid
                  ? 'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_45%)]'
                  : 'bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_48%)]'
                }
              `}
            />
            <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/90 to-transparent" />
            <div className="relative flex h-full flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {t('widget_preview')}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {activeMeta ? t(activeMeta.titleKey as never) : t('add_widget_title')}
                  </div>
                </div>
                <div className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-500 shadow-sm ring-1 ring-slate-200/80">
                  {dropIndicator.w} × {dropIndicator.h}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/80 bg-white/88 px-3 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    {activeMeta && (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200/80">
                        <activeMeta.Icon size={18} className={activeMeta.iconClassName} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-2.5 w-2/3 rounded-full bg-slate-200/90" />
                      <div className="h-2 w-1/2 rounded-full bg-slate-100" />
                    </div>
                  </div>
                </div>

                {(dropIndicator.h > 1 || dropIndicator.w > 1) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-12 rounded-2xl bg-white/62 ring-1 ring-white/80" />
                    <div className="h-12 rounded-2xl bg-white/50 ring-1 ring-white/70" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Original children */}
      {children}
    </div>
  );
}
