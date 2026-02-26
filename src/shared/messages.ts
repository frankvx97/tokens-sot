import type { BootstrapPayload, ExportRequest, ExportResult, ManualTokenGroup, PluginSettings } from './types';

export interface PluginWindowState {
  width: number;
  height: number;
  minimized: boolean;
}

export type PluginToUIMessage =
  | {
      type: 'bootstrap';
      payload: BootstrapPayload;
    }
  | {
      type: 'tokens-updated';
      payload: {
        variables: BootstrapPayload['tokens']['variables'];
        styles: BootstrapPayload['tokens']['styles'];
      };
    }
  | {
      type: 'settings-updated';
      payload: PluginSettings;
    }
  | {
      type: 'manual-sources-updated';
      payload: ManualTokenGroup[];
    }
  | {
      type: 'export-ready';
      payload: ExportResult;
    }
  | {
      type: 'error';
      payload: {
        code: string;
        message: string;
        detail?: unknown;
      };
    }
  | {
      type: 'window-state';
      payload: PluginWindowState;
    };

export type UIToPluginMessage =
  | {
      type: 'ui-ready';
    }
  | {
      type: 'refresh-data';
    }
  | {
      type: 'persist-settings';
      payload: PluginSettings;
    }
  | {
      type: 'persist-manual-sources';
      payload: ManualTokenGroup[];
    }
  | {
      type: 'request-export';
      payload: ExportRequest;
    }
  | {
      type: 'show-notification';
      payload: {
        message: string;
        error?: boolean;
      };
    }
  | {
      type: 'close-plugin';
    }
  | {
      type: 'resize-window';
      payload: {
        width: number;
        height: number;
      };
    }
  | {
      type: 'toggle-minimize';
    };

export type PluginMessageHandler = (message: UIToPluginMessage) => Promise<void> | void;

export type UIMessageHandler = (message: PluginToUIMessage) => void;
