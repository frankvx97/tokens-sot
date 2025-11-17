declare global {
  interface FigmaClipboardAPI {
    writeText(text: string): Promise<void>;
  }

  interface PluginAPI {
    readonly clipboard?: FigmaClipboardAPI;
  }
}

export {};
