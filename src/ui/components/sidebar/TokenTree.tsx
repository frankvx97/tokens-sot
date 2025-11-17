import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import type { TokenTreeNode } from '@/shared/types';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/ui/utils/cn';
import type { WithSelection } from '@/ui/state/selectors';

interface TokenTreeProps {
  nodes: WithSelection[];
  level?: number;
  onToggleSelection: (node: TokenTreeNode, nextState: boolean) => void;
}

export const TokenTree: React.FC<TokenTreeProps> = ({ nodes, level = 0, onToggleSelection }) => {
  const [openState, setOpenState] = React.useState<Record<string, boolean>>({});

  const toggleOpen = React.useCallback((id: string) => {
    setOpenState((previous) => ({
      ...previous,
      [id]: !previous[id]
    }));
  }, []);

  return (
    <ul className={cn('flex flex-col', level === 0 ? 'gap-2' : 'space-y-2')}>
      {nodes.map((item) => {
        const { node, selected, partiallySelected } = item;
        const isBranch = Boolean(node.children?.length);
        const defaultOpen = !node.collapsed || partiallySelected || selected;
        const isOpen = isBranch ? openState[node.id] ?? defaultOpen : false;
        const isTopLevel = level === 0;

        return (
          <li key={node.id}>
            <div
              className={cn(
                'group flex items-center rounded-md text-sm text-slate-300 transition hover:bg-slate-800/60',
                isTopLevel && isBranch && 'h-12 border border-slate-800 px-4',
                isTopLevel && !isBranch && 'h-12 border border-slate-800 px-4',
                !isTopLevel && 'h-8 px-2',
                isBranch && 'cursor-pointer'
              )}
              style={{ paddingLeft: isTopLevel ? undefined : `${level * 14}px` }}
              onClick={isBranch ? () => toggleOpen(node.id) : undefined}
            >
              <Checkbox
                className="mr-2"
                checked={partiallySelected ? 'indeterminate' : selected}
                onCheckedChange={(checked) => {
                  const nextState = checked === true || checked === 'indeterminate';
                  onToggleSelection(node, nextState);
                }}
                onClick={(e) => e.stopPropagation()}
              />

              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium text-slate-200">{node.name}</span>
                {node.description && (
                  <span className="text-[11px] text-slate-500 line-clamp-1">{node.description}</span>
                )}
              </div>

              {isBranch && (
                <ChevronRight
                  className={cn('h-4 w-4 ml-2 shrink-0 transform transition-transform text-slate-500', isOpen && 'rotate-90')}
                />
              )}
            </div>
            {isBranch && isOpen && item.children && (
              <TokenTree
                nodes={item.children}
                level={level + 1}
                onToggleSelection={onToggleSelection}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
};
