# NaviDash User Guide

Welcome to NaviDash. This guide is organized based on the current product release to help you quickly understand the UI layout, common operations, and data management workflows.

## Interface Layout

NaviDash currently consists of three main parts:

1. Main Canvas
   Used to arrange and display widgets, serving as your daily homepage workspace.
2. Bottom Floating Toolbar
   Provides entry points for the quick launcher, widget library, edit mode, and global settings.
3. Bottom Widget Shelf
   Expands from above the floating toolbar to search, horizontally browse, and add available widgets.

## Basic Usage

### Quick Launcher

- When not in edit mode and focus is not inside an input box, type directly or press `Ctrl/⌘ + K` or click the search button in the toolbar to open
- Use Up/Down arrow keys to navigate results, press `Enter` to open, or `Escape` to close
- When no links match, press `Enter` to search the web using the selected search engine in the launcher
- The launcher learns the relationship between "input query → opened link" locally in the current browser
- When multiple links match, targets frequently chosen for a given query are prioritized higher over time
- Learning history does not alter canvas widget positions and is not uploaded to the server by default
- You can view or clear learning history under "Settings → Data Tools"

### Entering Edit Mode

- Click the "Customize / Done" button in the bottom toolbar to toggle edit mode
- In edit mode, you can move widgets, open widget settings, and remove widgets

### Opening the Widget Library

- Click the "Widget Library" button in the bottom toolbar
- Browse horizontally or search widgets in the shelf; clicking to add will automatically collapse the shelf
- You can also drag widgets upward directly into the canvas; the shelf will make space when dragging begins
- Certain widgets automatically open their settings panel upon being added for easy initial configuration

## Widget Operations

### Adding Widgets

1. Open the widget library
2. Locate the widget you wish to add
3. Click to add, or drag it onto the main canvas where supported

The widget library currently offers:

- `Links`: Quick-access entry points
- `Today`: Time, date, and weather dashboard card
- `Memo`: Quick notes and scratchpad
- `Poster`: Borderless decorative poster card

Legacy widgets `Clock`, `Weather`, `Date`, `Quick Link`, `Todo`, and `Calendar` have been retired. When loading legacy layouts or backups, the system filters these out while preserving Today, Links, Memo, and Poster.

### Moving Widgets

1. Enter edit mode
2. Hold the drag handle at the top-left corner of the widget
3. Drag to the target position and release

If other widgets already occupy the target location, the system automatically reflows and shifts them.

### Editing Widget Content

Different widgets use different editing workflows:

- `Memo` can be edited directly inside the widget and saves automatically
- `Today`, `Links`, and `Poster` are configured via their settings panels

### Opening Widget Settings

1. Enter edit mode
2. Click the settings button at the top-right corner of the widget
3. Adjust dimensions or configurations in the popup settings panel

## Common Widgets Overview

### Today

- Combines time, English date, and real-time weather into a `2×2` card
- Fetches weather information via the server-side `/api/weather` proxy
- Check configuration status and test connections under "Weather Service" in global settings
- Enter a city or select matched latitude and longitude in Today settings
- API Key, Host, and auth type are configured only via server environment variables, never stored in widget data

If weather is not displayed, check the following first:

- Whether `QWEATHER_API_KEY` is correctly set in `.env`
- Whether the container or dev server has been restarted
- Whether the connection test in global settings succeeds
- Whether the city or coordinates in Today settings are valid

### Memo

- Supports direct text input
- Supports lightweight Markdown styling such as headings, lists, links, and blockquotes
- The widget automatically saves changes

### Links

- `1×1` size is ideal for a single high-frequency shortcut
- Horizontal sizes suit a collection of frequent sites or service bookmarks
- The launcher tracks opening behavior and progressively optimizes search ranking

### Poster

- Supports one or multiple images
- By default borderless and static, with optional carousel rotation and custom interval

## Global Settings

Click the "Settings" button in the bottom toolbar to open the global settings panel.

Currently divided into three main categories:

- Appearance
- Language
- Data Tools

### Appearance

Adjustable options include:

- Background presets
- Custom background image
- Blur intensity
- Overlay opacity
- Page title and Favicon in advanced options

### Language

- Switch the interface display language

### Data Tools

Supports the following features:

- Apply Blank, Focus Homepage, or Personal Wall templates
- Import bookmarks from browser-exported HTML files
- Export current configuration as JSON
- Import configuration from JSON
- Reset settings and widgets to default state

Applying templates and importing backups will overwrite current widgets and layouts; confirmation is required before proceeding. Exporting a backup beforehand is recommended.

The "Bookmarks" in the dock manages the full link library, which the quick launcher searches in its entirety. Links widgets only reference bookmarks pinned to the homepage; removing from a widget does not delete the bookmark, and deleting the widget does not affect the bookmark library. Importing browser HTML bookmarks only adds bookmarks without altering the current canvas.

## Data Storage & Persistence

NaviDash is primarily designed for local self-hosting, with runtime data stored in a host-mounted directory.

Mainly includes:

- Global settings
- Widget layouts
- Widget configurations

If using Docker, mounting the data directory outside the repository is recommended (e.g., `/opt/navidash-data`).

## Demo Mode

When Demo Mode is enabled:

- The page can be fully browsed and tested
- Frontend interactions remain functional
- Changes reset to default demo content upon page refresh
- No writes are actually persisted to disk

This mode is suitable for online demonstrations, not for long-term daily use.

## Frequently Asked Questions (FAQ)

### Why do my changes disappear after refreshing?

There are usually two possible causes:

- Currently running in Demo Mode
- The persistence directory is not mounted properly or lacks write permissions

### Why does Today widget show no weather data?

Please check:

- Whether `QWEATHER_API_KEY` is configured
- Whether the container has been restarted
- Whether the weather connection test in global settings succeeds
- Whether the city name or coordinates in Today are valid
- Whether the network has access to the weather service

### How do I fully back up my current homepage?

Open the settings panel and export JSON under "Data Tools".  
For Docker deployments, backing up the host data directory at the same time is also recommended.

### How do I reset to a clean state?

You can use the reset function in the settings panel.  
For a complete wipe, you can also delete the runtime data in the mount directory and restart the container.

