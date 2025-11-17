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
import { GripVertical, ChevronRight } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/ui/utils/cn';
import type { TokenTreeNode } from '@/shared/types';
import type { WithSelection } from '@/ui/state/selectors';

interface SortableCollectionItemProps {
  item: WithSelection;
  onToggleSelection: (node: TokenTreeNode, nextState: boolean) => void;
  onToggleOpen: (id: string) => void;
  isOpen: boolean;
  children?: React.ReactNode;
}

function SortableCollectionItem({
  item,
  onToggleSelection,
  onToggleOpen,
  isOpen,
  children
}: SortableCollectionItemProps) {
  const { node, selected, partiallySelected } = item;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <li ref={setNodeRef} style={style} className="relative">
      <div
        className={cn(
          'group flex items-center rounded-md px-4 h-12 text-sm text-slate-300 transition hover:bg-slate-800/60 border border-slate-800'
        )}
      >
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex items-center justify-center cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-slate-500 hover:text-slate-300 transition"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Checkbox */}
        <Checkbox
          className="mr-2 ml-1"
          checked={partiallySelected ? 'indeterminate' : selected}
          onCheckedChange={(checked) => {
            const nextState = checked === true || checked === 'indeterminate';
            onToggleSelection(node, nextState);
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Collection Name */}
        <div
          className="flex flex-1 flex-col cursor-pointer"
          onClick={() => onToggleOpen(node.id)}
        >
          <span className="text-sm font-medium text-slate-200">{node.name}</span>
        </div>

        {/* Chevron */}
        <ChevronRight
          className={cn(
            'h-4 w-4 ml-2 shrink-0 transform transition-transform text-slate-500 cursor-pointer',
            isOpen && 'rotate-90'
          )}
          onClick={() => onToggleOpen(node.id)}
        />
      </div>

      {/* Children (expanded content) */}
      {isOpen && children}
    </li>
  );
}

interface ReorderableCollectionsProps {
  items: WithSelection[];
  onToggleSelection: (node: TokenTreeNode, nextState: boolean) => void;
  onReorder: (newOrder: string[]) => void;
  renderChildren: (item: WithSelection) => React.ReactNode;
}

export const ReorderableCollections: React.FC<ReorderableCollectionsProps> = ({
  items,
  onToggleSelection,
  onReorder,
  renderChildren
}) => {
  const [openState, setOpenState] = React.useState<Record<string, boolean>>({});
  const [orderedItems, setOrderedItems] = React.useState(items);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // Allow 5px of movement before drag starts (better for click vs drag)
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

  const toggleOpen = React.useCallback((id: string) => {
    setOpenState((previous) => ({
      ...previous,
      [id]: !previous[id]
    }));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedItems.map((item) => item.node.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {orderedItems.map((item) => {
            const defaultOpen = !item.node.collapsed || item.partiallySelected || item.selected;
            const isOpen = openState[item.node.id] ?? defaultOpen;

            return (
              <SortableCollectionItem
                key={item.node.id}
                item={item}
                onToggleSelection={onToggleSelection}
                onToggleOpen={toggleOpen}
                isOpen={isOpen}
              >
                {renderChildren(item)}
              </SortableCollectionItem>
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
};
