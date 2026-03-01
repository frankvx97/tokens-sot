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
import { GripVertical, ChevronRight, Layers, Pencil, Check } from 'lucide-react';
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
  onRenameGroup?: (key: string, newName: string) => void;
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
  onRenameGroup,
  isOpen,
  level = 0,
  openState
}: SelectSourceItemProps) {
  const { node, selected, partiallySelected } = item;
  const isBranch = Boolean(node.children?.length);
  const isTopLevel = level === 0;
  const isMode = node.type === 'mode';

  // Inline rename state — only used for top-level non-draggable items (Styles)
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(node.name);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const confirmBtnRef = React.useRef<HTMLButtonElement>(null);

  // Keep editValue in sync when node.name changes from outside (e.g. settings loaded)
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(node.name);
    }
  }, [node.name, isEditing]);

  // Focus + select all when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handlePencilClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(node.name);
    setIsEditing(true);
  };

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.name && onRenameGroup) {
      onRenameGroup(node.key, trimmed);
    }
    // Always revert display to latest node.name (reducer will update it)
    setIsEditing(false);
  };

  const cancelRename = () => {
    setEditValue(node.name);
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      confirmBtnRef.current?.focus();
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Don't commit on blur if focus is moving to the confirm button —
    // the button's onClick will handle commit instead.
    if (e.relatedTarget === confirmBtnRef.current) return;
    commitRename();
  };

  // Show pencil button only on top-level items that are not draggable (i.e. Styles view)
  const showRenameButton = isTopLevel && !isDraggable && Boolean(onRenameGroup);

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
          'group flex text-sm text-slate-300 transition hover:bg-slate-800/60',
          isTopLevel ? 'h-12 items-center px-4 gap-2' : 'min-h-8 items-start py-1.5 px-2 rounded-md',
          isBranch && !isEditing && 'cursor-pointer'
        )}
        onClick={() => {
          if (isEditing) return;
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

        {/* Label / Inline Edit Input */}
        <div className="flex flex-1 flex-col min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent border-b border-accent text-sm font-medium text-slate-200 outline-none py-0.5 pr-1"
            />
          ) : (
            <>
              <span className={cn(
                'text-sm font-medium truncate',
                isMode ? 'text-slate-300' : 'text-slate-200'
              )}>
                {node.name}
              </span>
              {node.description && (
                <span className="text-[11px] text-slate-500 break-words">{node.description}</span>
              )}
            </>
          )}
        </div>

        {/* Confirm (check) button while editing — replaces pencil, primary style */}
        {showRenameButton && isEditing && (
          <button
            ref={confirmBtnRef}
            className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-accent text-accent-foreground transition hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-slate-900"
            onClick={(e) => { e.stopPropagation(); commitRename(); }}
            title="Save name"
            aria-label="Save name"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Rename (pencil) button — only for top-level style groups */}
        {showRenameButton && !isEditing && (
          <button
            className="ml-4 flex items-center justify-center p-0.5 text-slate-500 hover:text-slate-200 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
            onClick={handlePencilClick}
            title={`Rename "${node.name}"`}
            aria-label={`Rename ${node.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

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
  onRenameGroup?: (key: string, newName: string) => void;
}

export const SelectSource: React.FC<SelectSourceProps> = ({
  items,
  isDraggable = false,
  onToggleSelection,
  onReorder,
  onPreviewTarget,
  onRenameGroup
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
            onRenameGroup={onRenameGroup}
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
