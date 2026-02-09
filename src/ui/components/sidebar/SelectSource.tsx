import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronRight, Layers } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/ui/utils/cn';
import type { TokenTreeNode } from '@/shared/types';
import type { WithSelection } from '@/ui/state/selectors';

interface SelectSourceItemProps {
  item: WithSelection;
  isDraggable: boolean;
  onToggleSelection: (node: TokenTreeNode, nextState: boolean) => void;
  onToggleOpen: (id: string, currentIsOpen: boolean) => void;
  onPreviewTarget?: (name: string) => void;
  isOpen: boolean;
  level?: number;
  openState: Record<string, boolean>;
}

function SelectSourceItem({
  item,
  isDraggable,
  onToggleSelection,
  onToggleOpen,
  onPreviewTarget,
  isOpen,
  level = 0,
  openState
}: SelectSourceItemProps) {
  const { node, selected, partiallySelected } = item;
  const isBranch = Boolean(node.children?.length);
  const isTopLevel = level === 0;
  const isMode = node.type === 'mode';

  // Only use sortable if draggable and top level
  const sortableProps = useSortable({
    id: node.id,
    disabled: !isDraggable || !isTopLevel
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortableProps;

  const style = isDraggable && isTopLevel ? {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  } : undefined;

  return (
    <li
      ref={isTopLevel && isDraggable ? setNodeRef : undefined}
      style={style}
      className={cn(
        isTopLevel && 'rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden'
      )}
    >
      <div
        className={cn(
          'group flex items-center text-sm text-slate-300 transition hover:bg-slate-800/60',
          isTopLevel ? 'h-12 px-4 gap-2' : 'h-8 px-2 rounded-md',
          isBranch && 'cursor-pointer'
        )}
        onClick={() => {
          if (isBranch) {
            onToggleOpen(node.id, isOpen);
          }
          // For mode/collection nodes, set preview target when clicked
          if (onPreviewTarget && (node.type === 'mode' || node.type === 'collection')) {
            onPreviewTarget(node.name);
          }
        }}
      >
        {/* Drag Handle - only visible for draggable top-level items */}
        {isDraggable && isTopLevel && (
          <button
            {...attributes}
            {...listeners}
            className="flex items-center justify-center cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-slate-500 hover:text-slate-300 transition"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        {/* Checkbox */}
        <Checkbox
          className={cn('mr-2', isDraggable && isTopLevel && 'ml-1')}
          checked={partiallySelected ? 'indeterminate' : selected}
          onCheckedChange={(checked) => {
            const nextState = checked === true || checked === 'indeterminate';
            onToggleSelection(node, nextState);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Mode icon */}
        {isMode && (
          <Layers className="h-3.5 w-3.5 shrink-0 text-slate-500 mr-[12px]" />
        )}

        {/* Label */}
        <div className="flex flex-1 flex-col">
          <span className={cn(
            'text-sm font-medium',
            isMode ? 'text-slate-300' : 'text-slate-200'
          )}>
            {node.name}
          </span>
          {node.description && (
            <span className="text-[11px] text-slate-500 line-clamp-1">{node.description}</span>
          )}
        </div>

        {/* Chevron */}
        {isBranch && (
          <ChevronRight
            className={cn(
              'h-4 w-4 ml-2 shrink-0 transform transition-transform text-slate-500',
              isOpen && 'rotate-90'
            )}
          />
        )}
      </div>

      {/* Children (expanded content) */}
      {isBranch && isOpen && item.children && item.children.length > 0 && (
        <div
          className={cn(
            'border-t border-slate-800/70 bg-slate-950/40 py-2',
            isTopLevel ? 'pl-11 pr-3' : 'pl-7'
          )}
        >
          <div className="flex flex-col gap-2">
            {item.children.map((child) => {
              const childIsBranch = Boolean(child.node.children?.length);
              const childDefaultOpen = !child.node.collapsed || child.partiallySelected || child.selected;
              const childIsOpen = childIsBranch ? (openState[child.node.id] ?? childDefaultOpen) : false;

              return (
                <SelectSourceItem
                  key={child.node.id}
                  item={child}
                  isDraggable={false}
                  onToggleSelection={onToggleSelection}
                  onToggleOpen={onToggleOpen}
                  onPreviewTarget={onPreviewTarget}
                  isOpen={childIsOpen}
                  level={level + 1}
                  openState={openState}
                />
              );
            })}
          </div>
        </div>
      )}
    </li>
  );
}

interface SelectSourceProps {
  items: WithSelection[];
  isDraggable?: boolean;
  onToggleSelection: (node: TokenTreeNode, nextState: boolean) => void;
  onReorder?: (newOrder: string[]) => void;
  onPreviewTarget?: (name: string) => void;
}

export const SelectSource: React.FC<SelectSourceProps> = ({
  items,
  isDraggable = false,
  onToggleSelection,
  onReorder,
  onPreviewTarget
}) => {
  const [openState, setOpenState] = React.useState<Record<string, boolean>>({});
  const [orderedItems, setOrderedItems] = React.useState(items);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // Allow 5px of movement before drag starts
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Update local state when items prop changes
  React.useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  // Auto-expand items that are selected or partially selected
  React.useEffect(() => {
    const newOpenState: Record<string, boolean> = {};
    items.forEach((item) => {
      const defaultOpen = !item.node.collapsed || item.partiallySelected || item.selected;
      if (openState[item.node.id] === undefined && defaultOpen) {
        newOpenState[item.node.id] = defaultOpen;
      }
    });
    if (Object.keys(newOpenState).length > 0) {
      setOpenState((prev) => ({ ...prev, ...newOpenState }));
    }
  }, [items, openState]);

  // Fix: toggleOpen now receives the current visual open state to avoid
  // the bug where !undefined === true doesn't flip a visually-open node
  const toggleOpen = React.useCallback((id: string, currentIsOpen: boolean) => {
    setOpenState((previous) => ({
      ...previous,
      [id]: !currentIsOpen
    }));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isDraggable || !onReorder) return;

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedItems.findIndex((item) => item.node.id === active.id);
      const newIndex = orderedItems.findIndex((item) => item.node.id === over.id);

      const newOrderedItems = arrayMove(orderedItems, oldIndex, newIndex);
      setOrderedItems(newOrderedItems);

      // Notify parent of new order
      const newOrder = newOrderedItems.map((item) => item.node.name);
      onReorder(newOrder);
    }
  };

  const content = (
    <ul className="flex flex-col gap-2">
      {orderedItems.map((item) => {
        const defaultOpen = !item.node.collapsed || item.partiallySelected || item.selected;
        const isOpen = openState[item.node.id] ?? defaultOpen;

        return (
          <SelectSourceItem
            key={item.node.id}
            item={item}
            isDraggable={isDraggable}
            onToggleSelection={onToggleSelection}
            onToggleOpen={toggleOpen}
            onPreviewTarget={onPreviewTarget}
            isOpen={isOpen}
            level={0}
            openState={openState}
          />
        );
      })}
    </ul>
  );

  // Only wrap in DndContext if draggable
  if (isDraggable) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={orderedItems.map((item) => item.node.id)}
          strategy={verticalListSortingStrategy}
        >
          {content}
        </SortableContext>
      </DndContext>
    );
  }

  return content;
};
