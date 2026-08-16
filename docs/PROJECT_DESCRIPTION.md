# 🛠️ Navidash Project Development Instructions

## 1. Project Overview
Navidash is a personal dashboard / start page designed for Docker deployment.

Core Vision: Minimalist, efficient, highly customizable.

Design Style: Clean productivity style (similar to Notion / Raycast), light background, subtle borders, frosted glass effect.

Target Users: Self-hosting enthusiasts (Homelab users).

## 2. Technology Stack & Architecture
Framework: Next.js 14+ (App Router), TypeScript.

Styling: Tailwind CSS.

Icons: Lucide React.

State Management: Zustand (handles UI state and local config cache).

Data Persistence: * Initial: Browser LocalStorage + JSON export.

Advanced: Backend Node.js + SQLite (data stored in the `/data` directory for Docker mounting).

## 3. Core Feature Specifications
### A. Layout Structure
Sidebar: * Fixed width 200px, supports click to collapse (collapses to 64px).

Nested Bookmarks: Supports infinite-level folder hierarchy.

Header: * Height 56px (h-14), frosted glass background.

Includes: Global search box, server status (CPU/Memory), edit mode toggle button.

Main Canvas: * 12-column responsive grid system.

Widgets support preset sizes (1x1, 2x1, 2x2, 4x2).

### B. Data Schema
Please refer to the following interfaces when generating code:

```typescript
// Bookmark item
interface Bookmark {
  id: string;
  title: string;
  url?: string;
  icon?: string;
  children?: Bookmark[]; // Nested support
}

// Widget item
interface Widget {
  id: string;
  type: 'weather' | 'clock' | 'rss' | 'monitor';
  size: { w: number, h: number };
  position: { x: number, y: number };
  config: Record<string, any>; // Stores APIKey, city, font, etc.
}
```

## 4. Directory Structure Conventions
```plaintext
/src/app/          # Routes and APIs
/src/components/   # Components (layout/, widgets/, ui/, settings/)
/src/store/        # Zustand stores
/src/types/        # TS type definitions
/src/lib/          # Utilities (db.ts, utils.ts)
/data/             # Docker mount point
```

## 🤖 Initial Prompt for IDE AI (Directly Copyable)
"You are now my full-stack development assistant. We are going to develop a dashboard / start page project named Navidash.

Current task:

Please refer to `PROJECT_CONTEXT.md` in the root directory.

First, define the Bookmark and Widget interfaces in `src/types/index.ts`.

Then create `Sidebar.tsx`, `Header.tsx`, and `MainCanvas.tsx` under `src/components/layout/`.

Implement sidebar collapse logic and recursive rendering for nested bookmarks.

Please follow a minimalist productivity style using Tailwind CSS."

## 5. Future Roadmap
Widget Plugins: Support dynamic widget injection by users through a settings/configuration page.

System Monitor Widget: Write backend endpoints to query Docker Socket or Node Exporter for server metrics.

RSS Feed Widget: Requires backend CORS handling and XML parsing.

