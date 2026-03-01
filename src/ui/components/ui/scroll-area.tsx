import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/ui/utils/cn';

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    {/*
      Radix wraps children in `display:table; minWidth:100%` which bypasses overflow-hidden
      on all ancestors. The style tag below resets it to display:block so flex/grid children
      correctly truncate text instead of expanding the scroll container horizontally.
    */}
    <style>{`[data-radix-scroll-area-viewport]>div{display:block!important;min-width:0!important}`}</style>
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-inherit">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Scrollbar
      orientation="vertical"
      className="flex touch-none select-none transition-opacity duration-200 opacity-0 hover:opacity-100 data-[state=visible]:opacity-100 w-2 p-[1px]"
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-slate-600/80 hover:bg-slate-500/90 transition-colors" />
    </ScrollAreaPrimitive.Scrollbar>
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

export { ScrollArea };
