# Project Structure

This document aims to help developers quickly understand the project structure, core modules, and file responsibilities of **Navidash**.

## Directory Overview

```
src/
├── app/                  # Next.js App Router route entry points
├── components/           # React UI component library
│   ├── layout/           # Core layout components (CanvasToolbar, Sidebar, MainCanvas)
│   ├── settings/         # Settings-related components
│   ├── ui/               # Common basic UI components (Modal, Toast)
│   └── widgets/          # Current widget components and their config panels
├── lib/                  # Utility functions and server-side logic
├── store/                # Zustand global state management
├── types/                # TypeScript type definitions
└── globals.css           # Global styles (Tailwind CSS)
```

## Core Modules Breakdown

### 1. Global State Management (`src/store/`)
This project uses **Zustand** for lightweight state management, with some stores leveraging the `persist` middleware for LocalStorage persistence.

| Filename | Role | Key Functions |
| :--- | :--- | :--- |
| `useSidebarStore.ts` | **Widget Shelf State** | Controls opening and collapsing of the bottom widget shelf |
| `useWidgetStore.ts` | **Widget Management** | Manages widget configurations along with desktop and mobile layouts |
| `useUIStore.ts` | **Global UI Interaction** | Controls edit mode, settings modals, and the quick launcher |
| `useToastStore.ts` | **Notifications** | Manages the global toast notification queue |

### 2. Core Layout Components (`src/components/layout/`)
Responsible for the main framework and layout structure of the application.

| Component | Role |
| :--- | :--- |
| `Sidebar.tsx` | **Bottom widget shelf container**. Provides widget search, horizontal browsing, click-to-add, and drag-up-to-add. |
| `MainCanvas.tsx` | **Main content area**. Integrates the freeform canvas, responsive layout, and quick launcher. |
| `CanvasToolbar.tsx` | **Floating canvas toolbar**. Provides access to launcher, edit mode, widget library, and settings as needed. |
| `DataSyncer.tsx` | **Data syncer**. Headless UI-less component responsible for periodic background synchronization or initialization logic. |

### 3. Desktop Widgets (`src/components/widgets/`)
Implements specific widget logic. Widget renderers and library metadata are unified and registered in `registry.tsx`.

- `TodayWidget.tsx`: Current time, English date, and weather dashboard card.
- `LinksWidget.tsx`: Single or grouped frequent access entry points.
- `MemoWidget.tsx`: Directly editable memo sticky note.
- `PhotoWidget.tsx`: Borderless poster decorative card.
- Deprecated widgets are no longer maintained in implementation; the schema filters out corresponding types when reading legacy data.
- `registry.tsx`: Centrally maintains widget renderers and widget library metadata.
- `WidgetSettingsModal.tsx`: Standalone widget configuration modal.

### 4. Type Definitions (`src/types/index.ts`)
Defines core data structures and serves as the key to understanding data flow.

- `Widget`: Defines a widget item, including `id`, `type`, `size` (w/h), `position` (x/y), `config`.

### 5. API Routes (`src/app/api/`)
Next.js server-side API routes for handling data persistence requests (reading and writing JSON files).

- `/api/widget-snapshot`: Atomically reads and writes layouts and widget configs, rejecting stale writes using revisions.
- `/api/access`: Status, login, and logout endpoints for optional single-user access protection.
- `/api/settings`: Handles global application settings.
- `/api/weather`: Proxies weather API requests using server-side environment variables.
- `/api/weather/status`: Returns weather configuration status without exposing keys, and provides connection testing.

## Development Guide

### Adding a New Widget
1. Add the new type to the `type` field in the `Widget` interface in `src/types/index.ts`.
2. Create the component file under `src/components/widgets/` (e.g., `NewWidget.tsx`).
3. Register the rendering component and widget library metadata in `src/components/widgets/registry.tsx`.
4. If a configuration UI is needed, register the editor in `src/components/widgets/editors/registry.ts`.

### Modifying Sidebar / Shelf Behavior
- State logic is located in `src/store/useSidebarStore.ts`.
- Rendering and interaction logic is located in `src/components/layout/Sidebar.tsx`.

### Data Persistence Mechanism
Currently uses **JSON file storage** (development environment / Docker volume).
- The frontend calls APIs via the `saveToServer` helper function.
- Backend APIs (`src/app/api/...`) persist data to the server filesystem.
- `useWidgetStore` and `useSettingsStore` fetch data from the API during initialization.

