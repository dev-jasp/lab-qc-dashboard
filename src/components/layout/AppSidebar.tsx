import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import {
  Activity,
  AlertTriangle,
  Biohazard,
  Brain,
  Bug,
  ChevronDown,
  Clock,
  Gauge,
  LogOut,
  Microscope,
  Settings,
} from 'lucide-react';
import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { DISEASE_DEFINITIONS } from '@/constants/monitor-config';
import { clearSession, getAllViolations, getSession } from '@/lib/qcStorage';
import type { ControlTypeSlug, DiseaseSlug, QCSession } from '@/types/qc.types';
import { cn } from '@/utils/cn';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type SystemRoute = {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
};

type DiseaseRouteConfig = {
  slug: DiseaseSlug;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const DISEASE_ROUTE_CONFIG: DiseaseRouteConfig[] = [
  { slug: 'measles', name: 'Measles', icon: Biohazard },
  { slug: 'rubella', name: 'Rubella', icon: Microscope },
  { slug: 'rotavirus', name: 'Rotavirus', icon: Activity },
  { slug: 'japanese-encephalitis', name: 'Japanese Encephalitis', icon: Brain },
  { slug: 'dengue', name: 'Dengue', icon: Bug },
];

const CONTROL_LINKS: { slug: ControlTypeSlug; label: string }[] = [
  { slug: 'in-house-control', label: 'In-house' },
  { slug: 'positive-control', label: 'Positive' },
  { slug: 'negative-control', label: 'Negative' },
];

const SYSTEM_ROUTES: SystemRoute[] = [
  { href: '/history', icon: Clock, label: 'History' },
  { href: '/violations', icon: AlertTriangle, label: 'Violations' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

function getActiveDisease(pathname: string): DiseaseSlug | null {
  const match = pathname.match(/^\/monitor\/([^/]+)/);

  if (match === null) {
    return null;
  }

  const slug = match[1] as DiseaseSlug;
  return DISEASE_ROUTE_CONFIG.some((disease) => disease.slug === slug) ? slug : null;
}

function getActiveControl(pathname: string): ControlTypeSlug | null {
  const match = pathname.match(/^\/monitor\/[^/]+\/([^/]+)/);

  if (match === null) {
    return null;
  }

  const slug = match[1] as ControlTypeSlug;
  return CONTROL_LINKS.some((control) => control.slug === slug) ? slug : null;
}

function getRoleLabel(role: QCSession['role'] | undefined): string {
  if (role === undefined) {
    return 'Analyst';
  }

  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

function getInitials(session: QCSession | null): string {
  const source = session?.displayName || session?.username || 'Local User';

  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function SidebarTooltip({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const { open, isMobile } = useSidebar();

  if (open || isMobile) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { open, isMobile, setOpenMobile } = useSidebar();
  const [mounted, setMounted] = React.useState(false);
  const [session, setSession] = React.useState<QCSession | null>(null);
  const [openViolationCount, setOpenViolationCount] = React.useState(0);
  const [openDiseases, setOpenDiseases] = React.useState<Record<string, boolean>>({});
  const activeDisease = getActiveDisease(location.pathname);
  const activeControl = getActiveControl(location.pathname);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  React.useEffect(() => {
    let isCancelled = false;

    const loadSidebarMeta = async () => {
      const [currentSession, allViolations] = await Promise.all([getSession(), getAllViolations()]);

      if (isCancelled) {
        return;
      }

      setSession(currentSession);
      setOpenViolationCount(
        allViolations.filter((violation) => !violation.acknowledged && violation.severity === 'rejection').length,
      );
    };

    void loadSidebarMeta();

    const handleViolationRefresh = () => {
      void loadSidebarMeta();
    };

    window.addEventListener('qc-violations-changed', handleViolationRefresh);

    return () => {
      isCancelled = true;
      window.removeEventListener('qc-violations-changed', handleViolationRefresh);
    };
  }, [location.pathname]);

  const handleDiseaseToggle = (disease: DiseaseSlug, nextOpen: boolean) => {
    setOpenDiseases((currentValue) => ({
      ...currentValue,
      [disease]: nextOpen,
    }));
  };

  const handleSidebarNavigate = (href: string) => {
    navigate(href);

    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    setSession(null);
    navigate('/login');
  };

  const currentUserName = session?.displayName || session?.username || 'Local QC User';
  const currentRole = getRoleLabel(session?.role);
  const currentUserInitials = getInitials(session);

  return (
    <TooltipProvider>
      <Sidebar variant="sidebar" collapsible="icon" className={cn('relative', !mounted && 'no-transition')}>
        <SidebarHeader className="pr-16">
          <SidebarTooltip label="QC Pulse">
            <button
              type="button"
              onClick={() => handleSidebarNavigate('/monitor')}
              className={`flex w-full items-center rounded-xl px-2 py-2 transition ${open || isMobile ? 'justify-start' : 'justify-center'}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-blue)] text-white shadow-sm">
                <Gauge size={17} />
              </div>
              <div
                data-sidebar-label=""
                className="ml-3 flex min-w-0 flex-col overflow-hidden whitespace-nowrap text-left [--sidebar-label-width:11rem]"
              >
                <p className="text-[15px] font-bold tracking-[0.01em] text-[var(--brand-blue)]">QC PULSE</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9ca3af]">
                  Laboratory System
                </p>
              </div>
            </button>
          </SidebarTooltip>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>DISEASE LIST</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {DISEASE_ROUTE_CONFIG.map((disease) => {
                  const Icon = disease.icon;
                  const isCurrentDisease = activeDisease === disease.slug;
                  const isOpen = openDiseases[disease.slug] ?? false;
                  const diseaseDisplayName =
                    DISEASE_DEFINITIONS.find((item) => item.slug === disease.slug)?.name ?? disease.name;

                  return (
                    <SidebarMenuItem key={disease.slug}>
                      <CollapsiblePrimitive.Root
                        open={isOpen}
                        onOpenChange={(nextOpen) => handleDiseaseToggle(disease.slug, nextOpen)}
                      >
                        <SidebarTooltip label={diseaseDisplayName}>
                          <CollapsiblePrimitive.Trigger asChild>
                            <SidebarMenuButton
                              type="button"
                              isActive={isCurrentDisease}
                              title={diseaseDisplayName}
                              className={!open && !isMobile ? 'mx-auto h-10 w-10 rounded-2xl' : undefined}
                            >
                              <Icon size={17} className="shrink-0" />
                              <div
                                data-sidebar-label=""
                                className="ml-2 flex min-w-0 flex-1 items-center justify-between overflow-hidden whitespace-nowrap [--sidebar-label-width:11rem]"
                              >
                                <span className="truncate">{diseaseDisplayName}</span>
                                <ChevronDown
                                  size={16}
                                  className={cn(
                                    'ml-2 shrink-0 transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                                    isOpen ? 'rotate-180' : 'rotate-0',
                                  )}
                                />
                              </div>
                            </SidebarMenuButton>
                          </CollapsiblePrimitive.Trigger>
                        </SidebarTooltip>

                        <CollapsiblePrimitive.Content forceMount data-radix-collapsible-content="" className="overflow-hidden">
                          <SidebarMenuSub>
                            {CONTROL_LINKS.map((control) => {
                              const href = `/monitor/${disease.slug}/${control.slug}`;
                              const isActive = isCurrentDisease && activeControl === control.slug;

                              return (
                                <SidebarMenuSubItem key={control.slug}>
                                  <SidebarMenuSubButton asChild isActive={isActive}>
                                    <Link to={href} onClick={() => isMobile && setOpenMobile(false)}>
                                      {control.label}
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsiblePrimitive.Content>
                      </CollapsiblePrimitive.Root>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>SYSTEM</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SYSTEM_ROUTES.map((route) => {
                  const Icon = route.icon;
                  const isActive = location.pathname === route.href;

                  return (
                    <SidebarMenuItem key={route.href}>
                      <SidebarTooltip
                        label={
                          route.label === 'Violations' && openViolationCount > 0
                            ? `${route.label} (${openViolationCount})`
                            : route.label
                        }
                      >
                        <SidebarMenuButton
                          type="button"
                          isActive={isActive}
                          onClick={() => handleSidebarNavigate(route.href)}
                          title={route.label}
                          className={!open && !isMobile ? 'mx-auto h-10 w-10 rounded-2xl' : undefined}
                        >
                          <Icon size={17} className="shrink-0" />
                          <div
                            data-sidebar-label=""
                            className="ml-2 flex min-w-0 flex-1 items-center justify-between overflow-hidden whitespace-nowrap [--sidebar-label-width:8.5rem]"
                          >
                            <span className="truncate">{route.label}</span>
                            {route.label === 'Violations' && openViolationCount > 0 ? (
                              <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[#dc2626] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                                {openViolationCount}
                              </span>
                            ) : (
                              <span className="w-0" aria-hidden="true" />
                            )}
                          </div>
                        </SidebarMenuButton>
                      </SidebarTooltip>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          {!open && !isMobile ? (
            <div className="flex justify-center">
              <SidebarTooltip label={`${currentUserName} - ${currentRole} | Logout`}>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-blue)] text-sm font-semibold text-white"
                >
                  {currentUserInitials}
                </button>
              </SidebarTooltip>
            </div>
          ) : (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent hover:text-inherit">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-blue)] text-sm font-semibold text-white">
                    {currentUserInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#111827]">{currentUserName}</p>
                    <p className="text-xs text-[#6b7280]">{currentRole}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827]"
                  >
                    <LogOut size={16} />
                    <span className="sr-only">Logout</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  );
}
