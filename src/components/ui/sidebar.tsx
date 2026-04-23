import * as React from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { Dialog as SheetPrimitive, Slot } from 'radix-ui';
import { CaretLeftIcon } from '@phosphor-icons/react';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/utils/cn';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { SidebarContext, useSidebar } from '@/components/ui/sidebar-context';

const SIDEBAR_EXPANDED_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const SIDEBAR_MOBILE_WIDTH = 260;
const SIDEBAR_TRANSITION: Transition = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1],
};

const MotionSheetOverlay = motion.create(SheetPrimitive.Overlay);
const MotionSheetContent = motion.create(SheetPrimitive.Content);

function SidebarProvider({
  defaultOpen = true,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((currentOpen) => !currentOpen);
      return;
    }

    setOpen((currentOpen) => !currentOpen);
  }, [isMobile]);

  return (
    <SidebarContext.Provider
      value={{
        isMobile,
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }}
    >
      <div
        data-slot="sidebar-wrapper"
        className={cn('min-h-screen w-full bg-[var(--page-bg)] text-foreground', className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  className,
  children,
}: React.ComponentProps<'aside'> & {
  variant?: 'sidebar';
  collapsible?: 'icon';
}) {
  const { isMobile, open, openMobile, setOpenMobile } = useSidebar();
  const state = open ? 'expanded' : 'collapsed';
  const desktopWidth = open ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetPrimitive.Portal forceMount>
          <AnimatePresence initial={false}>
            {openMobile ? (
              <>
                <MotionSheetOverlay
                  key="sidebar-backdrop"
                  forceMount
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-40 bg-black/40"
                  onClick={() => setOpenMobile(false)}
                />
                <MotionSheetContent
                  key="mobile-sidebar"
                  forceMount
                  aria-label="Sidebar navigation"
                  data-slot="sidebar"
                  data-sidebar="sidebar"
                  data-state="expanded"
                  initial={{ x: -SIDEBAR_MOBILE_WIDTH }}
                  animate={{ x: 0 }}
                  exit={{ x: -SIDEBAR_MOBILE_WIDTH }}
                  transition={SIDEBAR_TRANSITION}
                  className={cn(
                    'group/sidebar fixed inset-y-0 left-0 z-50 flex h-dvh min-h-dvh flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-background)] p-0 text-[var(--sidebar-foreground)] shadow-lg outline-none',
                    className,
                  )}
                  style={{
                    width: SIDEBAR_MOBILE_WIDTH,
                    willChange: 'transform',
                  }}
                >
                  {children}
                </MotionSheetContent>
              </>
            ) : null}
          </AnimatePresence>
        </SheetPrimitive.Portal>
      </Sheet>
    );
  }

  return (
    <motion.aside
      data-slot="sidebar"
      data-sidebar="sidebar"
      data-state={state}
      initial={false}
      animate={{ width: desktopWidth }}
      transition={SIDEBAR_TRANSITION}
      className={cn(
        'group/sidebar fixed inset-y-0 left-0 z-30 hidden h-dvh flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)] md:flex',
        className,
      )}
      style={{
        flexShrink: 0,
        overflow: 'hidden',
        transform: 'translateZ(0)',
        willChange: 'width',
      }}
    >
      {children}
    </motion.aside>
  );
}

function SidebarInset({ className, style, ...props }: React.ComponentProps<typeof motion.div>) {
  const { isMobile, open } = useSidebar();
  const desktopMargin = open ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <motion.div
      data-slot="sidebar-inset"
      data-sidebar="inset"
      data-state={open ? 'expanded' : 'collapsed'}
      initial={false}
      animate={{ marginLeft: isMobile ? 0 : desktopMargin }}
      transition={SIDEBAR_TRANSITION}
      className={cn('flex min-w-0 flex-1 flex-col bg-[var(--page-bg)]', className)}
      style={{
        flex: 1,
        minWidth: 0,
        transform: isMobile ? undefined : 'translateZ(0)',
        willChange: isMobile ? undefined : 'margin-left',
        ...style,
      }}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const { open, isMobile } = useSidebar();

  return (
    <div
      data-slot="sidebar-header"
      className={cn(
        'min-h-[88px] py-5',
        !open && !isMobile ? 'px-3' : 'px-4',
        className,
      )}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { open, isMobile } = useSidebar();

  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        'min-h-0 flex-1 overflow-y-auto py-6',
        !open && !isMobile ? 'px-3' : 'px-4',
        className,
      )}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  const { open, isMobile } = useSidebar();

  return (
    <div
      data-slot="sidebar-footer"
      className={cn('mt-auto shrink-0 py-5', !open && !isMobile ? 'px-3' : 'px-4', className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'section'>) {
  return <section data-slot="sidebar-group" className={cn('mb-7', className)} {...props} />;
}

function SidebarGroupLabel({ className, children, ...props }: React.ComponentProps<'p'>) {
  const { open, isMobile } = useSidebar();

  return (
    <p
      data-slot="sidebar-group-label"
      className={cn(
        'mb-3 block h-4 overflow-hidden whitespace-nowrap px-1 text-[11px] font-semibold leading-4 tracking-[0.16em] text-[#94a3b8]',
        className,
      )}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {open || isMobile ? (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{
              opacity: 1,
              width: 'auto',
              transition: {
                opacity: { duration: 0.15, delay: 0.1 },
                width: SIDEBAR_TRANSITION,
              },
            }}
            exit={{
              opacity: 0,
              width: 0,
              transition: {
                opacity: { duration: 0.1 },
                width: SIDEBAR_TRANSITION,
              },
            }}
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {children}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </p>
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-content" className={cn('space-y-1', className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('space-y-1', className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn(className)} {...props} />;
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  size = 'default',
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  isActive?: boolean;
  size?: 'default' | 'lg';
}) {
  const { open, isMobile } = useSidebar();
  const Comp = asChild ? Slot.Root : 'button';
  const label = typeof props.title === 'string' ? props.title : undefined;

  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      title={!open && !isMobile ? label : undefined}
      className={cn(
        'flex w-full items-center gap-2 overflow-hidden whitespace-nowrap rounded-xl text-left text-sm font-medium outline-none transition-[background-color,color] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        size === 'lg' ? 'h-14 min-h-14 px-3 py-3' : 'h-10 min-h-10 px-3 py-2.5',
        isActive ? 'bg-[var(--sidebar-primary)] text-white shadow-sm' : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]',
        !open && !isMobile ? 'justify-center p-0' : 'justify-start',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
  const { open, isMobile } = useSidebar();

  if (!open && !isMobile) {
    return null;
  }

  return (
    <ul
      data-slot="sidebar-menu-sub"
      className={cn('mt-1 ml-5 space-y-1 border-l border-[#e5e7eb] pl-4', className)}
      {...props}
    />
  );
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-sub-item" className={cn(className)} {...props} />;
}

function SidebarMenuSubButton({
  asChild = false,
  isActive = false,
  className,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  isActive?: boolean;
}) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-active={isActive}
      className={cn(
        'flex min-h-9 w-full items-center rounded-lg px-3 text-sm transition-colors outline-none',
        isActive ? 'bg-[var(--sidebar-accent)] font-medium text-[var(--sidebar-accent-foreground)]' : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[var(--sidebar-accent-foreground)]',
        className,
      )}
      {...props}
    />
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
  const { isMobile, open, toggleSidebar } = useSidebar();

  if (isMobile) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
      onClick={toggleSidebar}
      data-slot="sidebar-rail"
      className={cn(
        'absolute top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--sidebar-border)] bg-white text-[#64748b] shadow-sm transition hover:text-[var(--brand-blue)]',
        open ? 'right-4' : 'left-4',
        className,
      )}
      {...props}
    >
      <motion.div initial={false} animate={{ rotate: open ? 0 : 180 }} transition={SIDEBAR_TRANSITION}>
        <CaretLeftIcon size={14} />
      </motion.div>
    </button>
  );
}

function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar();
  const isExpanded = isMobile ? openMobile : open;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      className={cn('text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]', className)}
      {...props}
    >
      <motion.div initial={false} animate={{ rotate: isExpanded ? 0 : 180 }} transition={SIDEBAR_TRANSITION}>
        <CaretLeftIcon size={18} />
      </motion.div>
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
};
