import { useCallback, useEffect, useMemo, useRef, useState, type FC, type PointerEvent as ReactPointerEvent } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { Check, Copy, Download, Maximize2, Minimize2, Settings } from 'lucide-react';
import { createPluginDispatcher, useAppDispatch, useAppState, usePluginBridge } from '../state/app-state';
import { AppStateProvider, createMessageListener } from '../state/app-state';
import JSZip from 'jszip';
import { AssetSidebar } from '../components/sidebar/AssetSidebar';
import { FormatSelector, type ExportFormat } from '../components/common/FormatSelector';
import { ConfigureModal } from '../components/modals/ConfigureModal';
import { Button } from '../components/ui/button';
import { getSelectedTokens, getAllTokens } from '../state/selectors';
import { buildExportArtifacts } from '../exporters';
import type { NormalizedToken } from '@/shared/types';

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_DEFAULT_WIDTH = 360;

const AppShell: FC = () => {
  const dispatch = useAppDispatch();
  const bridge = usePluginBridge();
  const state = useAppState();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('sass');
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const cssLikeFormat = selectedFormat === 'css' || selectedFormat === 'sass' || selectedFormat === 'less' || selectedFormat === 'stylus';

  useEffect(() => {
    const listener = createMessageListener(dispatch);
    window.addEventListener('message', listener);
    bridge.send({ type: 'ui-ready' });
    return () => window.removeEventListener('message', listener);
  }, [bridge, dispatch]);

  const selectedTokens = useMemo(() => getSelectedTokens(state), [state]);
  const tokenLookup = useMemo(() => {
    const map = new Map<string, NormalizedToken>();
    getAllTokens(state).forEach((token) => {
      map.set(token.id, token);
    });
    return map;
  }, [state]);

  const getPrismLanguage = (format: ExportFormat): string => {
    const languageMap: Record<ExportFormat, string> = {
      sass: 'css',
      less: 'css',
      stylus: 'css',
      js: 'javascript',
      json: 'json',
      tailwind: 'javascript',
      tailwindv4: 'css',
      css: 'css'
    };
    return languageMap[format] || 'css';
  };

  const extractColorLiteral = (valueText: string): string | null => {
    const match = valueText.match(/#(?:[0-9a-fA-F]{3,8})\b|rgba?\([^)]+\)|hsla?\([^)]+\)/);
    return match ? match[0] : null;
  };

  const renderCssLikeLine = (lineText: string, index: number) => {
    const declarationMatch = lineText.match(/^(\s*)(--?[\w-]+|@[\w-]+|\$[\w-]+)\s*:\s*([^;]+?)([;,]?)\s*$/);
    if (!declarationMatch) {
      if (/^\s*\/[/*]/.test(lineText)) {
        return (
          <div key={index}>
            <span className="whitespace-pre text-slate-500 italic">{lineText || ' '}</span>
          </div>
        );
      }
      if (/^\s*[{}]\s*$/.test(lineText)) {
        return (
          <div key={index}>
            <span className="whitespace-pre text-slate-300">{lineText || ' '}</span>
          </div>
        );
      }
      return (
        <div key={index}>
          <span className="whitespace-pre text-slate-200">{lineText || ' '}</span>
        </div>
      );
    }

    const [, indent, variableName, valueText, punctuation] = declarationMatch;
    const swatchColor = extractColorLiteral(valueText);

    return (
      <div key={index} className="whitespace-pre">
        <span className="text-slate-200">{indent}</span>
        <span className="text-sky-200 font-semibold">{variableName}</span>
        <span className="text-rose-300">:</span>
        <span> </span>
        {swatchColor && (
          <span className="relative mr-1.5 inline-flex h-3.5 w-3.5 overflow-hidden rounded-[2px] align-middle ring-1 ring-slate-500/70">
            <span className="absolute inset-0 bg-[linear-gradient(45deg,#ffffff_25%,transparent_25%,transparent_50%,#ffffff_50%,#ffffff_75%,transparent_75%,transparent)] bg-[length:6px_6px] opacity-40" />
            <span className="absolute inset-0" style={{ backgroundColor: swatchColor }} />
          </span>
        )}
        <span className="text-slate-100">{valueText}</span>
        {punctuation ? <span className="text-slate-400">{punctuation}</span> : null}
      </div>
    );
  };

  const exportArtifacts = useMemo(() => {
    if (!selectedTokens.length) return [];
    const options = { ...state.settings.exportOptions, format: selectedFormat };
    try {
      return buildExportArtifacts({ tokens: selectedTokens, format: selectedFormat, options, tokenLookup });
    } catch (error) {
      console.error('Failed to build export artifacts:', error);
      return [];
    }
  }, [selectedTokens, selectedFormat, state.settings.exportOptions, tokenLookup]);

  const previewTargetName = state.previewTargetName;
  const exportFileStrategy = state.settings.exportOptions.exportFileStrategy;

  // Find the artifact to preview based on previewTargetName (for multi-file mode)
  const previewArtifact = useMemo(() => {
    if (!exportArtifacts.length) return null;
    const isMultiFileMode = exportFileStrategy === 'multiple';
    
    // In multi-file mode with a target selected, find the matching artifact
    if (isMultiFileMode && previewTargetName && exportArtifacts.length > 1) {
      // Try matching by collection name first
      const byCollection = exportArtifacts.find(
        (artifact) => artifact.collectionName === previewTargetName
      );
      if (byCollection) return byCollection;

      // Try matching by filename containing the target name (for mode-level selection)
      const nameSlug = previewTargetName.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
      const byFileName = exportArtifacts.find(
        (artifact) => artifact.fileName.toLowerCase().includes(nameSlug)
      );
      if (byFileName) return byFileName;
    }
    
    // Default to first artifact
    return exportArtifacts[0];
  }, [exportArtifacts, previewTargetName, exportFileStrategy]);

  const previewCode = previewArtifact?.contents ?? '/* Tokens - Preview */\n/* Select tokens on the left to generate code snippets. */';

  const fallbackCopyText = (text: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!successful) {
          reject(new Error('document.execCommand("copy") returned false'));
          return;
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  const copyTextToClipboard = async (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    await fallbackCopyText(text);
  };

  const handleCopy = async () => {
    if (!previewArtifact) return;
    const contents = previewArtifact.contents;

    try {
      await copyTextToClipboard(contents);
      setIsCopied(true);
      console.log('Code copied to clipboard');

      // Reset the button state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const handleDownload = async () => {
    if (!exportArtifacts.length) return;
    try {
      if (exportArtifacts.length === 1) {
        const artifact = exportArtifacts[0];
        const blob = new Blob([artifact.contents], { type: 'text/plain' });
        triggerFileDownload(blob, artifact.fileName);
      } else {
        const zip = new JSZip();
        exportArtifacts.forEach((artifact) => { zip.file(artifact.fileName, artifact.contents); });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipName = `tokens-${selectedFormat}.zip`;
        triggerFileDownload(zipBlob, zipName);
      }
      // Delay notification so it appears after the native save dialog closes
      const fileCount = exportArtifacts.length;
      setTimeout(() => {
        bridge.send({
          type: 'show-notification',
          payload: {
            message: `Tokens exported — ${fileCount} file${fileCount > 1 ? 's' : ''} saved`
          }
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to download tokens:', error);
      bridge.send({
        type: 'show-notification',
        payload: {
          message: 'Export failed. Please try again.',
          error: true
        }
      });
    }
  };

  const triggerFileDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (state.windowState.minimized) return;

    let rafId: number | undefined;
    const onPointerMove = (event: PointerEvent) => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = undefined;
        const width = Math.min(Math.max(event.clientX, 720), window.screen.availWidth || 4096);
        const height = Math.min(Math.max(event.clientY, 520), window.screen.availHeight || 4096);
        bridge.send({
          type: 'resize-window',
          payload: { width, height }
        });
      });
    };

    const stopResize = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopResize);
    };

    const resizeHandle = document.getElementById('plugin-resize-handle');
    if (!resizeHandle) return undefined;

    const startResize = (event: PointerEvent) => {
      event.preventDefault();
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', stopResize);
    };

    resizeHandle.addEventListener('pointerdown', startResize);
    return () => {
      resizeHandle.removeEventListener('pointerdown', startResize);
      stopResize();
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [bridge, state.isBootstrapped, state.windowState.minimized]);

  // Sidebar width drag-to-resize using pointer capture on the splitter element
  const sidebarRafId = useRef<number | undefined>(undefined);

  const handleSplitterPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const onPointerMove = (ev: PointerEvent) => {
        if (sidebarRafId.current) return;
        sidebarRafId.current = window.requestAnimationFrame(() => {
          sidebarRafId.current = undefined;
          const maxWidth = Math.floor(window.innerWidth * 0.7);
          const newWidth = Math.min(Math.max(ev.clientX, SIDEBAR_MIN_WIDTH), maxWidth);
          setSidebarWidth(newWidth);
        });
      };

      const cleanup = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId);
        target.removeEventListener('pointermove', onPointerMove);
        target.removeEventListener('pointerup', cleanup);
        target.removeEventListener('pointercancel', cleanup);
        target.removeEventListener('lostpointercapture', cleanup);
        if (sidebarRafId.current) {
          window.cancelAnimationFrame(sidebarRafId.current);
          sidebarRafId.current = undefined;
        }
      };

      target.addEventListener('pointermove', onPointerMove);
      target.addEventListener('pointerup', cleanup);
      target.addEventListener('pointercancel', cleanup);
      target.addEventListener('lostpointercapture', cleanup);
    },
    []
  );

  if (!state.isBootstrapped) {
    return (
      <div className="flex h-[100vh] flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-accent" />
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Bootstrapping tokens…</p>
      </div>
    );
  }

  if (state.windowState.minimized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950/95">
        <Button
          size="icon"
          variant="accentOutline"
          onClick={() => bridge.send({ type: 'toggle-minimize' })}
          title="Expand plugin"
          aria-label="Expand plugin"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        className="grid h-screen min-h-0 gap-0 overflow-hidden bg-slate-950 text-slate-100"
        style={{ gridTemplateColumns: `${sidebarWidth}px 4px minmax(0,1fr)` }}
      >
        <AssetSidebar />
        {/* Sidebar resize splitter */}
        <div
          id="sidebar-splitter"
          className="group relative z-10 flex cursor-col-resize items-center justify-center bg-transparent touch-none"
          title="Drag to resize sidebar"
          role="separator"
          aria-orientation="vertical"
          onPointerDown={handleSplitterPointerDown}
        >
          <div className="h-full w-px bg-slate-800 transition-colors group-hover:bg-accent/60 group-active:bg-accent" />
        </div>
        <main className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-950">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Preview</span>
              {previewArtifact && exportArtifacts.length > 1 && (
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{previewArtifact.fileName}</span>
              )}
              <FormatSelector value={selectedFormat} onChange={setSelectedFormat} />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => bridge.send({
                  type: 'resize-window',
                  payload: {
                    width: window.screen.availWidth || 4096,
                    height: window.screen.availHeight || 4096
                  }
                })}
                title="Expand plugin to full size"
                aria-label="Expand plugin to full size"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => bridge.send({ type: 'toggle-minimize' })}
                title="Minimize plugin"
                aria-label="Minimize plugin"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button variant="accentOutline" size="sm" className="gap-1.5" onClick={() => setIsConfigureOpen(true)}>
                <Settings className="h-4 w-4" />
                Configure
              </Button>
            </div>
          </header>
          <section className="min-h-0 flex-1 overflow-hidden bg-slate-950">
            {cssLikeFormat ? (
              <div className="h-full overflow-auto p-4" style={{ backgroundColor: themes.nightOwl.plain.backgroundColor }}>
                <pre className="min-h-full w-full bg-transparent font-mono text-sm leading-relaxed text-slate-100">
                  {previewCode.split('\n').map((line, index) => renderCssLikeLine(line, index))}
                </pre>
              </div>
            ) : (
              <Highlight theme={themes.nightOwl} code={previewCode} language={getPrismLanguage(selectedFormat)}>
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <div
                    className="h-full overflow-auto p-4"
                    style={{ backgroundColor: style.backgroundColor, color: style.color }}
                  >
                    <pre
                      className={`${className} min-h-full w-full bg-transparent font-mono text-sm leading-relaxed`}
                      style={{ color: style.color }}
                    >
                      {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })}>
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </div>
                      ))}
                    </pre>
                  </div>
                )}
              </Highlight>
            )}
          </section>
          <footer className="flex h-14 shrink-0 items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/40 px-4 py-3">
            <Button onClick={handleCopy} disabled={!previewArtifact} variant="secondary" className="gap-2">
              {isCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button onClick={handleDownload} disabled={!exportArtifacts.length} className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </footer>
        </main>
      </div>
      <div
        id="plugin-resize-handle"
        className="absolute bottom-1 right-1 z-20 flex h-5 w-5 cursor-se-resize items-end justify-end text-slate-500 transition-colors hover:text-slate-300"
        title="Resize plugin"
        aria-hidden="true"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <line x1="2.5" y1="13.5" x2="13.5" y2="2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="7.5" y1="13.5" x2="13.5" y2="7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
      {isConfigureOpen && <ConfigureModal isOpen={isConfigureOpen} onClose={() => setIsConfigureOpen(false)} activeFormat={selectedFormat} onFormatChange={(f) => setSelectedFormat(f as ExportFormat)} />}
    </>
  );
};

const App: FC = () => {
  const dispatcher = useMemo(() => createPluginDispatcher(), []);
  return (
    <AppStateProvider dispatcher={dispatcher}>
      <AppShell />
    </AppStateProvider>
  );
};

export default App;
