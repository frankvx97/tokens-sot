import * as React from 'react';
import type { PluginSettings, TokenTreeNode } from '@/shared/types';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { SelectSource } from './SelectSource';
import { useAppDispatch, useAppState, usePluginBridge } from '@/ui/state/app-state';
import { collectSelectableIds, useTokenTreeWithSelection } from '@/ui/state/selectors';

const SOURCE_OPTIONS = [
  { value: 'variables', label: 'Variables' },
  { value: 'styles', label: 'Styles' }
] as const;

function countTokens(node: TokenTreeNode): number {
  if (node.type === 'token') return 1;
  if (!node.children?.length) return 0;
  return node.children.reduce((acc, child) => acc + countTokens(child), 0);
}

export const AssetSidebar: React.FC = () => {
  const { tree, activeSource } = useTokenTreeWithSelection();
  const state = useAppState();
  const dispatch = useAppDispatch();
  const bridge = usePluginBridge();

  const tokenCount = React.useMemo(
    () => tree.reduce((acc, item) => acc + countTokens(item.node), 0),
    [tree]
  );

  const updateSelection = React.useCallback(
    (node: TokenTreeNode, nextState: boolean) => {
      const currentSelection = new Set(state.settings.selectedTokenIds);
      const targetIds = node.type === 'token' ? [node.id] : collectSelectableIds(node);
      if (nextState) {
        targetIds.forEach((id) => currentSelection.add(id));
      } else {
        targetIds.forEach((id) => currentSelection.delete(id));
      }
      const nextSelection = Array.from(currentSelection);
      const nextSettings: PluginSettings = {
        ...state.settings,
        selectedTokenIds: nextSelection
      };
      dispatch({ type: 'SET_SELECTION', payload: nextSelection });
      bridge.send({
        type: 'persist-settings',
        payload: nextSettings
      });
    },
    [bridge, dispatch, state.settings]
  );

  const handleSourceChange = React.useCallback(
    (value: string) => {
      if (value !== 'variables' && value !== 'styles') return;
      const nextActive: PluginSettings['activeSource'] = value;
      const nextSettings: PluginSettings = {
        ...state.settings,
        activeSource: nextActive
      };
      dispatch({ type: 'SET_ACTIVE_SOURCE', payload: value });
      bridge.send({
        type: 'persist-settings',
        payload: nextSettings
      });
    },
    [bridge, dispatch, state.settings]
  );



  const handleCollectionReorder = React.useCallback(
    (newOrder: string[]) => {
      const nextSettings: PluginSettings = {
        ...state.settings,
        collectionOrder: newOrder
      };
      dispatch({ type: 'SET_COLLECTION_ORDER', payload: newOrder });
      bridge.send({
        type: 'persist-settings',
        payload: nextSettings
      });
    },
    [bridge, dispatch, state.settings]
  );

  const handlePreviewTarget = React.useCallback(
    (name: string) => {
      dispatch({ type: 'SET_PREVIEW_TARGET', payload: { id: name, name } });
    },
    [dispatch]
  );

  const isVariablesView = activeSource === 'variables';

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-slate-900/60 bg-slate-950">
      {/* Header with ASSETS label */}
      <div className="flex h-14 shrink-0 items-center border-b border-slate-800 bg-slate-900/40 px-4">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Assets
        </span>
      </div>

      {/* Variables/Styles Toggle */}
      <div className="border-b border-slate-800 px-4 py-3">
        <ToggleGroup
          type="single"
          value={activeSource}
          onValueChange={handleSourceChange}
          className="grid h-9 grid-cols-2 gap-1 rounded-lg bg-slate-900/80 p-1"
        >
          {SOURCE_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} size="sm">
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Section heading */}
      <div className="px-4 py-3">
        <h3 className="text-sm font-medium text-slate-200">
          Choose your {activeSource === 'variables' ? 'collections' : 'styles'}
        </h3>
      </div>

      {/* Token Tree List */}
  <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 px-4 pb-4">
          {tree.length ? (
            <SelectSource
              items={tree}
              isDraggable={isVariablesView}
              onToggleSelection={updateSelection}
              onReorder={isVariablesView ? handleCollectionReorder : undefined}
              onPreviewTarget={handlePreviewTarget}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-4 text-center text-xs text-slate-500">
              No {activeSource} found. Try importing manual tokens or ensure your Figma document has {activeSource}.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Credits Section */}
      <div className="border-t border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            Made with love from 🇸🇻 by{' '}
            <a
              href="https://www.linkedin.com/in/frank-px/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors underline"
            >
              Franklin Perez
            </a>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => window.open('https://tally.so/r/gDMqyN', '_blank')}
            title="Send feedback"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </Button>
        </div>
      </div>
    </aside>
  );
};
