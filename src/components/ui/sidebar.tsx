import * as React from 'react';
import { Slot } from 'radix-ui';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/utils/cn';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

type SidebarContextValue = {
  isMobile: boolean;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (context === null) {
    throw new Error('Sidebar components must be used within <SidebarProvider>.');
  }

  return context;
}

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
        className={cn('flex min-h-screen w-full bg-[var(--page-bg)] text-foreground', className)}
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

  const content = (
    <div
      data-slot="sidebar"
      data-state={state}
      className={cn(
        'group/sidebar flex h-full min-h-screen w-full flex-col overflow-hidden bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)]',
        className,
      )}
    >
      {children}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[288px] max-w-[288px] border-r border-[var(--sidebar-border)] bg-[var(--sidebar-background)] p-0 text-[var(--sidebar-foreground)]"
        >
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      data-slot="sidebar-shell"
      data-state={state}
      className={cn(
        'peer hidden shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-background)] transition-[width] duration-200 md:flex',
        open ? 'w-[288px]' : 'w-[84px]',
      )}
    >
      {content}
    </aside>
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn('flex min-w-0 flex-1 flex-col bg-[var(--page-bg)]', className)}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn('border-b border-[var(--sidebar-border)] px-4 py-5', className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn('flex-1 overflow-y-auto px-4 py-6', className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn('mt-auto border-t border-[var(--sidebar-border)] px-4 py-5', className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'section'>) {
  return <section data-slot="sidebar-group" className={cn('mb-7', className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'p'>) {
  const { open, isMobile } = useSidebar();

  if (!open && !isMobile) {
    return null;
  }

  return (
    <p
      data-slot="sidebar-group-label"
      className={cn('mb-3 px-1 text-[11px] font-semibold tracking-[0.16em] text-[#94a3b8]', className)}
      {...props}
    />
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
        'flex w-full items-center rounded-xl text-left text-sm font-medium transition-colors outline-none',
        size === 'lg' ? 'min-h-14 px-3 py-3' : 'min-h-10 px-3 py-2.5',
        isActive ? 'bg-[var(--sidebar-primary)] text-white shadow-sm' : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]',
        !open && !isMobile ? 'justify-center px-0' : 'gap-3',
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
        'absolute top-5 -right-3 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--sidebar-border)] bg-white text-[#64748b] shadow-sm transition hover:text-[var(--brand-blue)]',
        className,
      )}
      {...props}
    >
      {open ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
    </button>
  );
}

function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      className={cn('text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]', className)}
      {...props}
    >
      <PanelLeftOpen size={18} />
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
  useSidebar,
};
