import type { BootstrapPayload, ExportResult, ManualTokenGroup, PluginSettings } from './shared/types';
import type { PluginMessageHandler, PluginWindowState, UIToPluginMessage } from './shared/messages';
import { loadVariableTree } from './main/figma/variables';
import { loadStyleTree } from './main/figma/styles';

const DEFAULT_SETTINGS: PluginSettings = {
  lastOpenedAt: new Date().toISOString(),
  exportOptions: {
    format: 'css',
    casing: 'kebab-case',
    color: 'hex',
    unit: 'px',
    exportFileStrategy: 'single',
    includeTopLevelName: false,
    includeAllModes: true,
    ignoreAliases: false,
    useRootAlias: false,
    addFallback: false,
    separateModes: false,
    includeIndexFile: false
  },
  selectedTokenIds: [],
  manualSources: [],
  activeSource: 'variables'
};

const WINDOW_STORAGE_KEY = 'tokens-sot/window-state';
const DEFAULT_WINDOW_WIDTH = 1080;
const DEFAULT_WINDOW_HEIGHT = 720;
const MIN_WINDOW_WIDTH = 720;
const MIN_WINDOW_HEIGHT = 520;
const MAX_WINDOW_WIDTH = 4096;
const MAX_WINDOW_HEIGHT = 4096;
const MINIMIZED_WIDTH = 72;
const MINIMIZED_HEIGHT = 72;

console.log('Plugin UI initialized');

let windowState: PluginWindowState = {
  width: DEFAULT_WINDOW_WIDTH,
  height: DEFAULT_WINDOW_HEIGHT,
  minimized: false
};

function clampWindowSize(width: number, height: number) {
  return {
    width: Math.max(MIN_WINDOW_WIDTH, Math.min(MAX_WINDOW_WIDTH, Math.round(width))),
    height: Math.max(MIN_WINDOW_HEIGHT, Math.min(MAX_WINDOW_HEIGHT, Math.round(height)))
  };
}

async function loadWindowState(): Promise<PluginWindowState> {
  try {
    const stored = await figma.clientStorage.getAsync(WINDOW_STORAGE_KEY);
    if (!stored || typeof stored !== 'object') {
      return windowState;
    }
    const raw = stored as Partial<PluginWindowState>;
    const clamped = clampWindowSize(
      typeof raw.width === 'number' ? raw.width : DEFAULT_WINDOW_WIDTH,
      typeof raw.height === 'number' ? raw.height : DEFAULT_WINDOW_HEIGHT
    );
    return {
      width: clamped.width,
      height: clamped.height,
      minimized: Boolean(raw.minimized)
    };
  } catch (error) {
    console.error('Error loading window state:', error);
    return windowState;
  }
}

async function persistWindowState(nextState: PluginWindowState) {
  try {
    await figma.clientStorage.setAsync(WINDOW_STORAGE_KEY, nextState);
  } catch (error) {
    console.error('Error persisting window state:', error);
  }
}

function applyWindowSize(nextState: PluginWindowState) {
  if (nextState.minimized) {
    figma.ui.resize(MINIMIZED_WIDTH, MINIMIZED_HEIGHT);
    return;
  }
  figma.ui.resize(nextState.width, nextState.height);
}

async function setWindowState(nextState: PluginWindowState) {
  windowState = nextState;
  applyWindowSize(windowState);
  await persistWindowState(windowState);
  figma.ui.postMessage({ type: 'window-state', payload: windowState });
}

async function loadStoredSettings(): Promise<PluginSettings> {
  console.log('Loading stored settings...');
  try {
    const stored = await figma.clientStorage.getAsync('tokens-sot/settings');
    if (stored) {
      return {
        ...DEFAULT_SETTINGS,
        ...stored,
        exportOptions: {
          ...DEFAULT_SETTINGS.exportOptions,
          ...stored.exportOptions
        }
      } satisfies PluginSettings;
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading stored settings:', error);
    return DEFAULT_SETTINGS;
  }
}

async function loadManualSources(): Promise<ManualTokenGroup[]> {
  console.log('Loading manual sources...');
  try {
    const stored = await figma.clientStorage.getAsync('tokens-sot/manual-sources');
    if (Array.isArray(stored)) {
      return stored as ManualTokenGroup[];
    }
    return [];
  } catch (error) {
    console.error('Error loading manual sources:', error);
    return [];
  }
}

async function gatherBootstrapPayload(): Promise<BootstrapPayload> {
  console.log('Gathering bootstrap payload...');
  try {
    const [settings, manualSources] = await Promise.all([
      loadStoredSettings(),
      loadManualSources()
    ]);

    // Load variables with user's collection order
    const variables = await loadVariableTree({ 
      includeValues: true,
      collectionOrder: settings.collectionOrder 
    });
    
    const styles = await loadStyleTree({
      includeValues: true,
      nameOverrides: settings.styleGroupNames ?? {}
    });

    console.log('Bootstrap data loaded:', {
      variablesCount: variables.length,
      stylesCount: styles.length,
      manualSourcesCount: manualSources.length
    });

    const updatedSettings: PluginSettings = {
      ...settings,
      manualSources
    };

    // Safely access currentUser with try-catch in case of permission issues
    let userId = 'anonymous';
    let userName = 'Unknown User';
    let isDevMode = false;

    try {
      userId = figma.currentUser?.id ?? 'anonymous';
      userName = figma.currentUser?.name ?? 'Unknown User';
      isDevMode = figma.editorType === 'figma' && figma.mode === 'codegen';
    } catch (error) {
      console.warn('Could not access currentUser info:', error);
    }

    return {
      user: {
        id: userId,
        name: userName,
        isDevMode
      },
      documentName: figma.root.name,
      fetchedAt: new Date().toISOString(),
      tokens: {
        variables,
        styles
      },
      settings: updatedSettings
    } satisfies BootstrapPayload;
  } catch (error) {
    console.error('Error gathering bootstrap payload:', error);
    throw error;
  }
}

async function persistSettings(payload: PluginSettings) {
  const { manualSources: _manualSources, ...rest } = payload;
  await figma.clientStorage.setAsync('tokens-sot/settings', rest);
}

async function persistManualSources(groups: ManualTokenGroup[]) {
  await figma.clientStorage.setAsync('tokens-sot/manual-sources', groups);
}

async function handleExportRequest(): Promise<ExportResult> {
  // Implementation filled in later when exporters are ready.
  return {
    artifacts: [],
    summary: {
      tokenCount: 0,
      generatedAt: new Date().toISOString()
    }
  } satisfies ExportResult;
}

const handler: PluginMessageHandler = async (msg: UIToPluginMessage) => {
  console.log('Received message from UI:', msg.type);
  try {
    switch (msg.type) {
      case 'ui-ready': {
        console.log('UI is ready, sending bootstrap data...');
        const bootstrap = await gatherBootstrapPayload();
        figma.ui.postMessage({ type: 'bootstrap', payload: bootstrap });
        figma.ui.postMessage({ type: 'window-state', payload: windowState });
        console.log('Bootstrap data sent to UI');
        break;
      }
      case 'refresh-data': {
        console.log('Refreshing data...');
        const bootstrap = await gatherBootstrapPayload();
        figma.ui.postMessage({
          type: 'tokens-updated',
          payload: {
            variables: bootstrap.tokens.variables,
            styles: bootstrap.tokens.styles
          }
        });
        break;
      }
      case 'persist-settings': {
        await persistSettings(msg.payload);
        figma.ui.postMessage({ type: 'settings-updated', payload: msg.payload });
        break;
      }
      case 'persist-manual-sources': {
        await persistManualSources(msg.payload);
        figma.ui.postMessage({
          type: 'manual-sources-updated',
          payload: msg.payload
        });
        break;
      }
      case 'request-export': {
        const result = await handleExportRequest();
        figma.ui.postMessage({ type: 'export-ready', payload: result });
        break;
      }
      case 'show-notification': {
        const message = msg.payload.message || '';
        if (message) {
          figma.notify(message, { timeout: 3000, error: msg.payload.error });
        }
        break;
      }
      case 'close-plugin': {
        figma.closePlugin();
        break;
      }
      case 'resize-window': {
        const clamped = clampWindowSize(msg.payload.width, msg.payload.height);
        await setWindowState({
          width: clamped.width,
          height: clamped.height,
          minimized: false
        });
        break;
      }
      case 'toggle-minimize': {
        if (windowState.minimized) {
          await setWindowState({
            ...windowState,
            minimized: false
          });
        } else {
          const clamped = clampWindowSize(windowState.width, windowState.height);
          await setWindowState({
            width: clamped.width,
            height: clamped.height,
            minimized: true
          });
        }
        break;
      }
      default: {
        const neverType: never = msg;
        throw new Error(`Unhandled UI message: ${JSON.stringify(neverType)}`);
      }
    }
  } catch (error) {
    console.error('Error handling message:', msg.type, error);
    figma.ui.postMessage({
      type: 'error',
      payload: {
        code: 'HANDLER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        detail: error
      }
    });
  }
};

async function initializePlugin() {
  windowState = await loadWindowState();
  figma.showUI(__html__, {
    width: windowState.minimized ? MINIMIZED_WIDTH : windowState.width,
    height: windowState.minimized ? MINIMIZED_HEIGHT : windowState.height,
    themeColors: true
  });
  figma.ui.onmessage = handler;
}

void initializePlugin();
