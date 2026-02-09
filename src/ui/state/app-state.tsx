import { createContext, useContext, useReducer, type Dispatch, type PropsWithChildren } from 'react';
import type {
  BootstrapPayload,
  ExportOptions,
  PluginSettings,
  TokenTreeNode
} from '@/shared/types';
import type { PluginToUIMessage, UIToPluginMessage } from '@/shared/messages';

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
}

const defaultExportOptions: ExportOptions = {
  format: 'css',
  casing: 'kebab-case',
  color: 'hex',
  unit: 'px',
  exportFileStrategy: 'single',
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
  exportStatus: 'idle'
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
  | { type: 'EXPORT_STATUS'; payload: AppState['exportStatus'] }
  | { type: 'EXPORT_SUMMARY'; payload: AppState['lastExportSummary'] }
  | { type: 'ERROR'; payload: AppState['lastError'] | undefined };

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
