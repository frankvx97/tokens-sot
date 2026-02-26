import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/ui/utils/cn';

const toggleGroupItemVariants = cva(
  'inline-flex w-full items-center justify-center whitespace-nowrap rounded-md border border-transparent px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        default: 'h-9',
        sm: 'h-8 text-xs',
        lg: 'h-10 text-base'
      },
      tone: {
        default: 'text-slate-200 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:shadow hover:bg-slate-800/60',
        muted: 'text-slate-300 data-[state=on]:border-accent data-[state=on]:bg-accent/20 data-[state=on]:text-slate-50 hover:bg-slate-800/50'
      }
    },
    defaultVariants: {
      size: 'default',
      tone: 'default'
    }
  }
);

const ToggleGroup = ToggleGroupPrimitive.Root;

interface ToggleGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>,
    VariantProps<typeof toggleGroupItemVariants> {
  className?: string;
  children?: React.ReactNode;
}

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  ToggleGroupItemProps
>(({ className, size, tone, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(toggleGroupItemVariants({ size, tone }), className)}
    {...props}
  />
));
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
