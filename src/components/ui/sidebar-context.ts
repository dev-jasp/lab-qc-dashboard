import * as React from 'react';

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

export { SidebarContext, useSidebar };
export type { SidebarContextValue };
