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
  const [session, setSession] = React.useState<QCSession | null>(null);
  const [openViolationCount, setOpenViolationCount] = React.useState(0);
  const [openDiseases, setOpenDiseases] = React.useState<Record<string, boolean>>({});
  const activeDisease = getActiveDisease(location.pathname);
  const activeControl = getActiveControl(location.pathname);

  React.useEffect(() => {
    if (activeDisease === null) {
      return;
    }

    setOpenDiseases((currentValue) => ({
      ...currentValue,
      [activeDisease]: true,
    }));
  }, [activeDisease]);

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

  const handleDiseaseToggle = (disease: DiseaseSlug) => {
    setOpenDiseases((currentValue) => ({
      ...currentValue,
      [disease]: !currentValue[disease],
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
      <Sidebar variant="sidebar" collapsible="icon" className="relative">
        <SidebarHeader>
          <SidebarTooltip label="QC Pulse">
            <button
              type="button"
              onClick={() => handleSidebarNavigate('/monitor')}
              className={`flex w-full items-center rounded-xl transition ${open || isMobile ? 'justify-start gap-3 px-2 py-2' : 'justify-center py-2'}`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-blue)] text-white shadow-sm">
                <Gauge size={17} />
              </div>
              {(open || isMobile) && (
                <div className="min-w-0 text-left">
                  <p className="text-[15px] font-bold tracking-[0.01em] text-[var(--brand-blue)]">QC PULSE</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9ca3af]">
                    Laboratory System
                  </p>
                </div>
              )}
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
                  const isOpen = openDiseases[disease.slug] ?? isCurrentDisease;
                  const diseaseDisplayName =
                    DISEASE_DEFINITIONS.find((item) => item.slug === disease.slug)?.name ?? disease.name;

                  return (
                    <SidebarMenuItem key={disease.slug}>
                      <CollapsiblePrimitive.Root open={isOpen} onOpenChange={() => handleDiseaseToggle(disease.slug)}>
                        <CollapsiblePrimitive.Trigger asChild>
                          <SidebarTooltip label={diseaseDisplayName}>
                            <SidebarMenuButton
                              type="button"
                              isActive={isCurrentDisease}
                              title={diseaseDisplayName}
                              className={!open && !isMobile ? 'mx-auto h-10 w-10 rounded-2xl' : undefined}
                            >
                              <Icon size={17} />
                              {(open || isMobile) && (
                                <>
                                  <span className="flex-1 truncate">{diseaseDisplayName}</span>
                                  <ChevronDown
                                    size={16}
                                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                  />
                                </>
                              )}
                            </SidebarMenuButton>
                          </SidebarTooltip>
                        </CollapsiblePrimitive.Trigger>

                        <CollapsiblePrimitive.Content>
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
                          <Icon size={17} />
                          {(open || isMobile) && (
                            <>
                              <span className="flex-1">{route.label}</span>
                              {route.label === 'Violations' && openViolationCount > 0 && (
                                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                                  {openViolationCount}
                                </span>
                              )}
                            </>
                          )}
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
              <SidebarTooltip label={`${currentUserName} — ${currentRole} | Logout`}>
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
