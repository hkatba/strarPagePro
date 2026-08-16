import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import {
  migrateWidgetConfigsToBookmarks,
  normalizeSettings,
  normalizeWidgetSnapshot,
  SettingsNormalizationSchema,
  SettingsSchema,
  splitWidgets,
  WidgetConfigsArraySchema,
  WidgetLayoutsArraySchema,
  WidgetLayoutsByModeSchema,
  StoredWidgetSnapshotSchema,
  WidgetSnapshotSchema,
  WidgetsArraySchema,
} from '@/lib/schemas';
import {
  Settings,
  Widget,
  WidgetConfigEntry,
  WidgetLayout,
  WidgetLayoutsByMode,
  WidgetSnapshot,
} from '@/types';
import { logger } from '@/lib/logger';
import { ensureLayoutsByMode } from '@/lib/widgetLayouts';
import {
  DEMO_DATA_VERSION,
  DEMO_SETTINGS,
  DEMO_WIDGET_SNAPSHOT,
  isServerDemoMode,
} from '@/lib/demo';

const DATA_FILE_VERSION = 1;
const DEFAULT_DIR = '/app/data';
const CWD_DATA = path.join(process.cwd(), 'data');
const DATA_DIR = process.env.DATA_DIR || (fsSync.existsSync(DEFAULT_DIR) ? DEFAULT_DIR : CWD_DATA);
const WIDGETS_FILE = path.join(DATA_DIR, 'widgets.json');
const WIDGET_LAYOUTS_FILE = path.join(DATA_DIR, 'widget-layouts.json');
const WIDGET_CONFIGS_FILE = path.join(DATA_DIR, 'widget-configs.json');
const WIDGET_SNAPSHOT_FILE = path.join(DATA_DIR, 'widget-snapshot.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Check whether demo mode is active (compatible with server and client environment variables)
const IS_DEMO_MODE = isServerDemoMode;

/**
 * Ensure the data directory exists.
 * If it does not exist, create the directory recursively.
 * @returns {Promise<void>}
 */
async function ensureDataDir() {
  if (IS_DEMO_MODE) return;

  try {
    await fs.access(DATA_DIR);
  } catch {
    logger.info(`Creating data directory at ${DATA_DIR}`);
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

function createVersionedDataSchema(payloadSchema: z.ZodTypeAny) {
  return z.object({
    version: z.number().int().positive(),
    data: payloadSchema,
  });
}

function parseStoredJson(raw: unknown, payloadSchema: z.ZodTypeAny): unknown {
  const versionedSchema = createVersionedDataSchema(payloadSchema);
  const versionedResult = versionedSchema.safeParse(raw);

  if (versionedResult.success) {
    return versionedResult.data.data;
  }

  return payloadSchema.parse(raw);
}

async function readJsonFile(filePath: string, schema: z.ZodTypeAny): Promise<unknown | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return parseStoredJson(JSON.parse(data), schema);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    logger.error(`Failed to read or validate JSON file at ${filePath}`, error);
    return null;
  }
}

async function writeJsonFileAtomic(filePath: string, data: unknown): Promise<void> {
  const tempFilePath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;

  try {
    await fs.writeFile(tempFilePath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempFilePath, filePath);
  } catch (error) {
    await fs.rm(tempFilePath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export class WidgetSnapshotConflictError extends Error {
  constructor(public readonly currentSnapshot: WidgetSnapshot) {
    super('Widget snapshot revision conflict');
    this.name = 'WidgetSnapshotConflictError';
  }
}

let snapshotWriteQueue: Promise<void> = Promise.resolve();

export async function getWidgetSnapshot(): Promise<WidgetSnapshot> {
  if (IS_DEMO_MODE) {
    return normalizeWidgetSnapshot(DEMO_WIDGET_SNAPSHOT);
  }

  await ensureDataDir();
  const snapshot = await readJsonFile(WIDGET_SNAPSHOT_FILE, StoredWidgetSnapshotSchema);
  if (snapshot) {
    return normalizeWidgetSnapshot(snapshot);
  }

  const layoutsByMode = (await getWidgetLayoutsByMode()) ?? {
    desktop: [],
    mobile: [],
  };
  const legacyConfigs = (await getWidgetConfigs()) ?? [];
  const migrated = migrateWidgetConfigsToBookmarks(legacyConfigs);
  const hasLegacyData =
    layoutsByMode.desktop.length > 0 ||
    layoutsByMode.mobile.length > 0 ||
    legacyConfigs.length > 0;

  return {
    schemaVersion: 2,
    revision: hasLegacyData ? 1 : 0,
    layoutsByMode,
    ...migrated,
  };
}

export function saveWidgetSnapshot(
  expectedRevision: number,
  data: Pick<WidgetSnapshot, 'schemaVersion' | 'layoutsByMode' | 'configs' | 'bookmarks'>
): Promise<WidgetSnapshot> {
  let result!: WidgetSnapshot;

  const operation = snapshotWriteQueue.then(async () => {
    const current = await getWidgetSnapshot();
    if (current.revision !== expectedRevision) {
      throw new WidgetSnapshotConflictError(current);
    }

    result = WidgetSnapshotSchema.parse({
      ...data,
      revision: current.revision + 1,
    });
    await writeJsonFileAtomic(WIDGET_SNAPSHOT_FILE, result);
  });

  snapshotWriteQueue = operation.then(
    () => undefined,
    () => undefined
  );

  return operation.then(() => result);
}

export async function getWidgetLayoutsByMode(): Promise<WidgetLayoutsByMode | null> {
  if (IS_DEMO_MODE) {
    return ensureLayoutsByMode(DEMO_WIDGET_SNAPSHOT.layoutsByMode);
  }

  try {
    await ensureDataDir();
    const layouts = await readJsonFile(
      WIDGET_LAYOUTS_FILE,
      z.union([WidgetLayoutsByModeSchema, WidgetLayoutsArraySchema])
    );

    if (layouts) {
      return ensureLayoutsByMode(layouts as WidgetLayoutsByMode | WidgetLayout[], []);
    }

    const widgets = await readJsonFile(WIDGETS_FILE, WidgetsArraySchema);
    if (!widgets) return null;
    return ensureLayoutsByMode(splitWidgets(widgets as Widget[]).layouts, []);
  } catch (error) {
    logger.error('Failed to read widget layouts', error);
    return null;
  }
}

export async function getWidgetConfigs(): Promise<WidgetConfigEntry[] | null> {
  if (IS_DEMO_MODE) {
    return WidgetConfigsArraySchema.parse(DEMO_WIDGET_SNAPSHOT.configs);
  }

  try {
    await ensureDataDir();
    const configs = await readJsonFile(WIDGET_CONFIGS_FILE, WidgetConfigsArraySchema);
    if (configs) return configs as WidgetConfigEntry[];

    const widgets = await readJsonFile(WIDGETS_FILE, WidgetsArraySchema);
    if (!widgets) return null;
    return splitWidgets(widgets as Widget[]).configs;
  } catch (error) {
    logger.error('Failed to read widget configs', error);
    return null;
  }
}

/**
 * Read settings data.
 * Reads settings from JSON file, returning null if the file does not exist.
 * @returns {Promise<Settings | null>} Settings object or null
 */
export async function getSettings(): Promise<Settings | null> {
  if (IS_DEMO_MODE) {
    logger.info('Demo mode: returning demo settings');
    return DEMO_SETTINGS;
  }

  try {
    await ensureDataDir();
    const settings = await readJsonFile(SETTINGS_FILE, SettingsNormalizationSchema);
    return settings ? normalizeSettings(settings) : null;
  } catch (error) {
    logger.error('Failed to read settings', error);
    return null;
  }
}

/**
 * Get the last modified timestamp of the settings file.
 * Used for frontend polling to check for data updates.
 * @returns {Promise<number>} Timestamp (ms)
 */
export async function getSettingsLastModified(): Promise<number> {
  if (IS_DEMO_MODE) return DEMO_DATA_VERSION;

  try {
    await ensureDataDir();
    const stats = await fs.stat(SETTINGS_FILE);
    return stats.mtimeMs;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    logger.error('Failed to get settings stats', error);
    return 0;
  }
}

/**
 * Save settings data.
 * Writes the settings object to a JSON file.
 * @param {Settings} settings - Settings object to save
 * @returns {Promise<void>}
 * @throws {Error} Throws an error if writing fails
 */
export async function saveSettings(settings: Settings): Promise<void> {
  if (IS_DEMO_MODE) {
    logger.info('Demo mode: save skipped');
    return;
  }

  try {
    await ensureDataDir();
    const parsedSettings = SettingsSchema.parse(settings);
    await writeJsonFileAtomic(SETTINGS_FILE, {
      version: DATA_FILE_VERSION,
      data: parsedSettings,
    });
    logger.info('Settings saved successfully');
  } catch (error) {
    logger.error('Failed to save settings', error);
    throw error;
  }
}
