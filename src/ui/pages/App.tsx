import { useEffect, useMemo, useState, type FC } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { createPluginDispatcher, useAppDispatch, useAppState, usePluginBridge } from '../state/app-state';
import { AppStateProvider, createMessageListener } from '../state/app-state';
import JSZip from 'jszip';
import { AssetSidebar } from '../components/sidebar/AssetSidebar';
import { FormatSelector, type ExportFormat } from '../components/common/FormatSelector';
import { ConfigureModal } from '../components/modals/ConfigureModal';
import { getSelectedTokens, getAllTokens } from '../state/selectors';
import { buildExportArtifacts } from '../exporters';
import type { NormalizedToken } from '@/shared/types';

const AppShell: FC = () => {
  const dispatch = useAppDispatch();
  const bridge = usePluginBridge();
  const state = useAppState();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('sass');
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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
      sass: 'scss',
      less: 'less',
      stylus: 'stylus',
      js: 'javascript',
      json: 'json',
      tailwind: 'javascript',
      css: 'css'
    };
    return languageMap[format] || 'css';
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

  const previewCode = exportArtifacts[0]?.contents ?? '/* Tokens - Preview */\n/* Select tokens on the left to generate code snippets. */';

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
    if (!exportArtifacts.length) return;
    const contents = exportArtifacts[0].contents;

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
    if (exportArtifacts.length === 1) {
      const artifact = exportArtifacts[0];
      const blob = new Blob([artifact.contents], { type: 'text/plain' });
      triggerFileDownload(blob, artifact.fileName);
      return;
    }
    const zip = new JSZip();
    exportArtifacts.forEach((artifact) => { zip.file(artifact.fileName, artifact.contents); });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipName = `tokens-${selectedFormat}.zip`;
    triggerFileDownload(zipBlob, zipName);
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

  if (!state.isBootstrapped) {
    return (
      <div className="flex h-[100vh] flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-sky-500" />
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Bootstrapping tokens…</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid h-screen min-h-0 grid-cols-[360px_minmax(0,1fr)] gap-0 overflow-hidden bg-slate-950 text-slate-100">
        <AssetSidebar />
        <main className="flex h-full min-h-0 flex-col overflow-hidden border-l border-slate-800 bg-slate-950">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Preview</span>
              <FormatSelector value={selectedFormat} onChange={setSelectedFormat} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsConfigureOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-blue-500 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configure
              </button>
            </div>
          </header>
          <section className="min-h-0 flex-1 overflow-hidden bg-slate-950">
            <div className="h-full overflow-auto p-4">
              <Highlight theme={themes.nightOwl} code={previewCode} language={getPrismLanguage(selectedFormat)}>
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre className={`${className} font-mono text-sm leading-relaxed`} style={style}>
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            </div>
          </section>
          <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/40 px-4 py-3">
            <button onClick={handleCopy} disabled={!exportArtifacts.length} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              {isCopied ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
            <button onClick={handleDownload} disabled={!exportArtifacts.length} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </footer>
        </main>
      </div>
      {isConfigureOpen && <ConfigureModal isOpen={isConfigureOpen} onClose={() => setIsConfigureOpen(false)} />}
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
