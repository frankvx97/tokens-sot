import { useMemo } from 'react';
import type { ManualToken, ManualTokenGroup, TokenTreeNode, NormalizedToken } from '@/shared/types';
import { useAppState } from './app-state';
import type { AppState } from './app-state';

export interface WithSelection {
  node: TokenTreeNode;
  selected: boolean;
  partiallySelected: boolean;
  children?: WithSelection[];
}

type SelectionLookup = Set<string>;

export function buildManualTree(groups: ManualTokenGroup[]): TokenTreeNode[] {
  if (!groups.length) return [];

  return groups.map((group) => {
    const groupPath = [group.name];
    return {
      id: `manual-group:${group.id}`,
      key: `manual-group:${group.id}`,
      name: group.name,
      type: 'group',
      sourceType: 'manual',
      selectable: true,
      description: group.description,
      path: ['Manual tokens', ...groupPath],
      collapsed: true,
      children: group.tokens.map((token) => manualTokenToNode(token, group))
    } satisfies TokenTreeNode;
  });
}

function manualTokenToNode(token: ManualToken, group: ManualTokenGroup): TokenTreeNode {
  return {
    id: `manual:${token.id}`,
    key: `manual:${token.id}`,
    name: token.name,
    type: 'token',
    sourceType: 'manual',
    selectable: true,
    path: ['Manual tokens', group.name],
    token: {
      id: token.id,
      key: `manual:${token.id}`,
      name: token.name,
      kind: token.kind,
      description: token.metadata?.description as string | undefined,
      collection: 'Manual tokens',
      groupPath: [group.name],
      sourceType: 'manual',
      sourceId: token.id,
      modes: [
        {
          modeId: 'manual',
          modeName: 'Manual',
          value: token.value,
          aliasOf: null
        }
      ]
    }
  } satisfies TokenTreeNode;
}

function annotateSelection(tree: TokenTreeNode[], selectedIds: SelectionLookup): WithSelection[] {
  return tree.map((node) => {
    if (node.children) {
      const annotatedChildren = annotateSelection(node.children, selectedIds);
      const hasChildren = annotatedChildren.length > 0;
      const selected = hasChildren && annotatedChildren.every((child) => child.selected);
      const partiallySelected =
        hasChildren &&
        annotatedChildren.some((child) => child.partiallySelected || child.selected) &&
        !selected;
      return {
        node,
        selected,
        partiallySelected,
        children: annotatedChildren
      };
    }

    return {
      node,
      selected: selectedIds.has(node.id),
      partiallySelected: false
    };
  });
}

export function useTokenTreeWithSelection(): {
  tree: WithSelection[];
  activeSource: 'variables' | 'styles';
} {
  const state = useAppState();

  return useMemo(() => {
    const { tokens, settings } = state;
    const selectedLookup: SelectionLookup = new Set(settings.selectedTokenIds);

    let sourceTree: TokenTreeNode[] = [];
    if (settings.activeSource === 'variables') {
      sourceTree = [...tokens.variables];

      // Apply user-defined collection order immediately in the UI so the
      // optimistic drag-reorder stays stable before the next bootstrap/refresh.
      if (settings.collectionOrder?.length) {
        const order = settings.collectionOrder;
        const orderIndex = new Map<string, number>();
        order.forEach((name, idx) => {
          orderIndex.set(name, idx);
        });
        const fallbackIndex = order.length + 1;
        sourceTree.sort((a, b) => {
          const ia = orderIndex.get(a.name);
          const ib = orderIndex.get(b.name);
          const aPos = ia === undefined ? fallbackIndex : ia;
          const bPos = ib === undefined ? fallbackIndex : ib;
          return aPos - bPos;
        });
      }

      if (settings.manualSources.length) {
        sourceTree = [
          ...sourceTree,
          {
            id: 'manual-root',
            key: 'manual-root',
            name: 'Manual tokens',
            type: 'collection',
            sourceType: 'manual',
            selectable: true,
            path: ['Manual tokens'],
            collapsed: false,
            children: buildManualTree(settings.manualSources)
          }
        ];
      }
    } else {
      sourceTree = tokens.styles;
    }

    const annotated = annotateSelection(sourceTree, selectedLookup);

    return {
      tree: annotated,
      activeSource: settings.activeSource
    };
  }, [state]);
}

export function flattenTree(node: TokenTreeNode): TokenTreeNode[] {
  if (!node.children?.length) return [node];
  return [node, ...node.children.flatMap((child) => flattenTree(child))];
}

export function collectSelectableIds(node: TokenTreeNode): string[] {
  if (!node.children?.length) {
    return node.selectable ? [node.id] : [];
  }

  const childIds = node.children.flatMap((child) => collectSelectableIds(child));
  if ((node.type === 'token' || node.type === 'mode') && node.selectable) {
    return [node.id, ...childIds];
  }

  return childIds;
}

/**
 * Extract all selected tokens from the state.
 * Now handles the collection > mode > group > token hierarchy.
 */
export function getSelectedTokens(state: AppState): NormalizedToken[] {
  const selectedIds = new Set(state.settings.selectedTokenIds);
  const tokens: NormalizedToken[] = [];

  // Helper to collect tokens from tree
  function collectTokens(nodes: TokenTreeNode[]) {
    nodes.forEach((node) => {
      // For mode nodes: if the mode node itself is deselected (none of its children selected),
      // skip it entirely. If it's partially or fully selected, recurse.
      if (node.type === 'mode') {
        // Check if any descendant of this mode is selected
        const modeIds = collectSelectableIds(node);
        const anySelected = modeIds.some((id) => selectedIds.has(id));
        if (!anySelected) return;
      }

      if (node.type === 'token' && node.token && selectedIds.has(node.id)) {
        tokens.push(node.token);
      }
      if (node.children) {
        collectTokens(node.children);
      }
    });
  }

  // Collect from BOTH sources so download exports everything selected
  collectTokens(state.tokens.variables);
  collectTokens(state.tokens.styles);
  // Include manual tokens if present
  if (state.settings.manualSources.length) {
    const manualTree = buildManualTree(state.settings.manualSources);
    collectTokens(manualTree);
  }

  return tokens;
}

export function getAllTokens(state: AppState): NormalizedToken[] {
  const tokens: NormalizedToken[] = [];

  const collectTokens = (nodes: TokenTreeNode[]) => {
    nodes.forEach((node) => {
      if (node.type === 'token' && node.token) {
        tokens.push(node.token);
      }
      if (node.children) {
        collectTokens(node.children);
      }
    });
  };

  collectTokens(state.tokens.variables);
  collectTokens(state.tokens.styles);

  if (state.settings.manualSources.length) {
    const manualTree = buildManualTree(state.settings.manualSources);
    collectTokens(manualTree);
  }

  return tokens;
}
