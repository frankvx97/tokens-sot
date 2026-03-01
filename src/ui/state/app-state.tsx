import { createContext, useContext, useReducer, type Dispatch, type PropsWithChildren } from 'react';
import type {
  BootstrapPayload,
  ExportOptions,
  PluginSettings,
  TokenTreeNode
} from '@/shared/types';
import type { PluginToUIMessage, PluginWindowState, UIToPluginMessage } from '@/shared/messages';

export interface AppState {
  isBootstrapped: boolean;
  tokens: {
    variables: TokenTreeNode[];
    styles: TokenTreeNode[];
  };
  settings: PluginSettings;
  exportStatus: 'idle' | 'generating' | 'ready' | 'error';
  lastExportSummary?: {
    tokenCount: number;
    generatedAt: string;
  };
  lastError?: {
    code: string;
    message: string;
  };
  /** ID of the collection/group currently selected for preview in multi-file mode */
  previewTargetId?: string;
  /** Name of the collection/group for matching with export artifacts */
  previewTargetName?: string;
  windowState: PluginWindowState;
}

const defaultExportOptions: ExportOptions = {
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
};

const defaultSettings: PluginSettings = {
  lastOpenedAt: new Date().toISOString(),
  exportOptions: defaultExportOptions,
  selectedTokenIds: [],
  manualSources: [],
  activeSource: 'variables'
};

const initialState: AppState = {
  isBootstrapped: false,
  tokens: {
    variables: [],
    styles: []
  },
  settings: defaultSettings,
  exportStatus: 'idle',
  windowState: {
    width: 1080,
    height: 720,
    minimized: false
  }
};

const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<Dispatch<AppAction> | undefined>(undefined);

interface PluginBridge {
  send: (message: UIToPluginMessage) => void;
}

const PluginBridgeContext = createContext<PluginBridge | undefined>(undefined);

export type AppAction =
  | { type: 'BOOTSTRAP'; payload: BootstrapPayload }
  | { type: 'TOKENS_UPDATED'; payload: { variables: TokenTreeNode[]; styles: TokenTreeNode[] } }
  | { type: 'SETTINGS_UPDATED'; payload: PluginSettings }
  | { type: 'UPDATE_EXPORT_OPTIONS'; payload: ExportOptions }
  | { type: 'SET_ACTIVE_SOURCE'; payload: PluginSettings['activeSource'] }
  | { type: 'SET_SELECTION'; payload: string[] }
  | { type: 'SET_MANUAL_SOURCES'; payload: PluginSettings['manualSources'] }
  | { type: 'SET_COLLECTION_ORDER'; payload: string[] }
  | { type: 'SET_SELECTED_MODE'; payload: string | undefined }
  | { type: 'SET_PREVIEW_TARGET'; payload: { id: string; name: string } | undefined }
  | { type: 'SET_STYLE_GROUP_NAME'; payload: { key: string; name: string } }
  | { type: 'EXPORT_STATUS'; payload: AppState['exportStatus'] }
  | { type: 'EXPORT_SUMMARY'; payload: AppState['lastExportSummary'] }
  | { type: 'ERROR'; payload: AppState['lastError'] | undefined }
  | { type: 'SET_WINDOW_STATE'; payload: PluginWindowState };

/**
 * Recursively patches every token node under a style root to reflect a renamed
 * collection label.  Only nodes whose token.collection matches oldName are updated.
 */
function patchStyleRootName(
  nodes: TokenTreeNode[],
  rootKey: string,
  newName: string
): TokenTreeNode[] {
  return nodes.map((node) => {
    // Find the root node by its key (e.g. "paint-styles")
    if (node.key === rootKey) {
      const oldName = node.name;
      return {
        ...node,
        name: newName,
        path: node.path.length > 0 ? [newName, ...node.path.slice(1)] : [newName],
        children: node.children
          ? patchCollectionInChildren(node.children, oldName, newName)
          : node.children
      };
    }
    return node;
  });
}

/**
 * Walks a subtree updating token.collection from oldName to newName and
 * fixing path[0] on group/token nodes.
 */
function patchCollectionInChildren(
  nodes: TokenTreeNode[],
  oldName: string,
  newName: string
): TokenTreeNode[] {
  return nodes.map((node) => {
    const patchedPath =
      node.path[0] === oldName ? [newName, ...node.path.slice(1)] : node.path;
    const patchedToken =
      node.token && node.token.collection === oldName
        ? { ...node.token, collection: newName }
        : node.token;
    return {
      ...node,
      path: patchedPath,
      token: patchedToken,
      children: node.children
        ? patchCollectionInChildren(node.children, oldName, newName)
        : node.children
    };
  });
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'BOOTSTRAP':
      return {
        ...state,
        isBootstrapped: true,
        tokens: action.payload.tokens,
        settings: action.payload.settings,
        exportStatus: 'idle',
        lastError: undefined
      };
    case 'TOKENS_UPDATED':
      return {
        ...state,
        tokens: {
          variables: action.payload.variables,
          styles: action.payload.styles
        }
      };
    case 'SETTINGS_UPDATED':
      return {
        ...state,
        settings: action.payload
      };
    case 'UPDATE_EXPORT_OPTIONS':
      return {
        ...state,
        settings: {
          ...state.settings,
          exportOptions: action.payload
        }
      };
    case 'SET_ACTIVE_SOURCE':
      return {
        ...state,
        settings: {
          ...state.settings,
          activeSource: action.payload
        }
      };
    case 'SET_SELECTION':
      return {
        ...state,
        settings: {
          ...state.settings,
          selectedTokenIds: action.payload
        }
      };
    case 'SET_MANUAL_SOURCES':
      return {
        ...state,
        settings: {
          ...state.settings,
          manualSources: action.payload
        }
      };
    case 'SET_COLLECTION_ORDER':
      return {
        ...state,
        settings: {
          ...state.settings,
          collectionOrder: action.payload
        }
      };
    case 'SET_SELECTED_MODE':
      return {
        ...state,
        settings: {
          ...state.settings,
          selectedModeId: action.payload
        }
      };
    case 'SET_PREVIEW_TARGET':
      return {
        ...state,
        previewTargetId: action.payload?.id,
        previewTargetName: action.payload?.name
      };
    case 'EXPORT_STATUS':
      return {
        ...state,
        exportStatus: action.payload
      };
    case 'EXPORT_SUMMARY':
      return {
        ...state,
        lastExportSummary: action.payload ?? state.lastExportSummary
      };
    case 'ERROR':
      return {
        ...state,
        lastError: action.payload,
        exportStatus: action.payload ? 'error' : state.exportStatus
      };
    case 'SET_STYLE_GROUP_NAME': {
      const { key, name } = action.payload;
      const updatedStyleGroupNames = {
        ...state.settings.styleGroupNames,
        [key]: name
      };
      const updatedStyles = patchStyleRootName(state.tokens.styles, key, name);
      return {
        ...state,
        tokens: {
          ...state.tokens,
          styles: updatedStyles
        },
        settings: {
          ...state.settings,
          styleGroupNames: updatedStyleGroupNames
        }
      };
    }
    case 'SET_WINDOW_STATE':
      return {
        ...state,
        windowState: action.payload
      };
    default:
      return state;
  }
}

interface AppStateProviderProps extends PropsWithChildren<{ dispatcher: PluginBridge }> {}

export const AppStateProvider = ({ children, dispatcher }: AppStateProviderProps) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppDispatchContext.Provider value={dispatch}>
      <PluginBridgeContext.Provider value={dispatcher}>
        <AppStateContext.Provider value={state}>{children}</AppStateContext.Provider>
      </PluginBridgeContext.Provider>
    </AppDispatchContext.Provider>
  );
};

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return ctx;
}

export function useAppDispatch() {
  const ctx = useContext(AppDispatchContext);
  if (!ctx) {
    throw new Error('useAppDispatch must be used within AppStateProvider');
  }
  return ctx;
}

export function usePluginBridge() {
  const ctx = useContext(PluginBridgeContext);
  if (!ctx) {
    throw new Error('usePluginBridge must be used within AppStateProvider');
  }
  return ctx;
}

export function createMessageListener(dispatch: Dispatch<AppAction>) {
  return (event: MessageEvent<unknown>) => {
    const { data } = event;
    const message =
      data && typeof data === 'object' && 'pluginMessage' in data
        ? (data as { pluginMessage: PluginToUIMessage }).pluginMessage
        : (data as PluginToUIMessage | undefined);
    if (!message) return;

    switch (message.type) {
      case 'bootstrap':
        dispatch({ type: 'BOOTSTRAP', payload: message.payload });
        break;
      case 'tokens-updated':
        dispatch({ type: 'TOKENS_UPDATED', payload: message.payload });
        break;
      case 'settings-updated':
        dispatch({ type: 'SETTINGS_UPDATED', payload: message.payload });
        break;
      case 'manual-sources-updated':
        dispatch({ type: 'SET_MANUAL_SOURCES', payload: message.payload });
        break;
      case 'export-ready':
        dispatch({ type: 'EXPORT_STATUS', payload: 'ready' });
        dispatch({ type: 'EXPORT_SUMMARY', payload: message.payload.summary });
        break;
      case 'error':
        dispatch({
          type: 'ERROR',
          payload: {
            code: message.payload.code,
            message: message.payload.message
          }
        });
        break;
      case 'window-state':
        dispatch({ type: 'SET_WINDOW_STATE', payload: message.payload });
        break;
      default:
        break;
    }
  };
}

export function createPluginDispatcher(): PluginBridge {
  return {
    send: (message: UIToPluginMessage) => {
      parent.postMessage({ pluginMessage: message }, '*');
    }
  };
}
