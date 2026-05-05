import {
  ArrowRightIcon,
  BellIcon,
  CaretDownIcon,
  ChartBarIcon,
  ClockIcon,
  GearIcon,
  SignOutIcon,
  VirusIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { AnimatePresence, motion, type Transition } from 'framer-motion';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { DISEASE_DEFINITIONS } from '@/constants/monitor-config';
import { useAuth } from '@/hooks/useAuth';
import { getAllViolations } from '@/lib/qcStorage';
import type { ControlTypeSlug, DiseaseSlug } from '@/types/qc.types';
import { cn } from '@/utils/cn';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar-context';
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
  { slug: 'measles', name: 'Measles', icon: VirusIcon },
  { slug: 'rubella', name: 'Rubella', icon: VirusIcon },
  { slug: 'rotavirus', name: 'Rotavirus', icon: VirusIcon },
  { slug: 'japanese-encephalitis', name: 'Japanese Encephalitis', icon: VirusIcon },
  { slug: 'dengue', name: 'Dengue', icon: VirusIcon },
];

const CONTROL_LINKS: { slug: ControlTypeSlug; label: string }[] = [
  { slug: 'in-house-control', label: 'In-house' },
  { slug: 'positive-control', label: 'Positive' },
  { slug: 'negative-control', label: 'Negative' },
];

const SYSTEM_ROUTES: SystemRoute[] = [
  { href: '/history', icon: ClockIcon, label: 'History' },
  { href: '/violations', icon: WarningIcon, label: 'Violations' },
  { href: '/settings', icon: GearIcon, label: 'Settings' },
];

const DISEASE_ACCENTS: Record<DiseaseSlug, string> = {
  measles: '#2563eb',
  rubella: '#db2777',
  rotavirus: '#ea580c',
  'japanese-encephalitis': '#7c3aed',
  dengue: '#0891b2',
};

const DISEASE_BADGES: Record<DiseaseSlug, string> = {
  measles: 'MEA',
  rubella: 'RUB',
  rotavirus: 'ROT',
  'japanese-encephalitis': 'JE',
  dengue: 'DEN',
};

const SIDEBAR_TRANSITION: Transition = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1],
};

const FLYOUT_LEFT = 76;
const FLYOUT_WIDTH = 244;
const FLYOUT_HEIGHT = 198;
const FLYOUT_ANIMATION: Transition = {
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1],
};

type FloatingDiseaseState = {
  disease: DiseaseRouteConfig;
  displayName: string;
  top: number;
};

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

function SidebarAnimatedLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, isMobile } = useSidebar();

  if (isMobile) {
    return (
      <div data-sidebar-label="" className={className}>
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {open ? (
        <motion.div
          key="label"
          data-sidebar-label=""
          initial={{ opacity: 0, width: 0 }}
          animate={{
            opacity: 1,
            flexGrow: 1,
            width: 'auto',
            transition: {
              opacity: { duration: 0.15, delay: 0.1 },
              width: SIDEBAR_TRANSITION,
              flexGrow: SIDEBAR_TRANSITION,
            },
          }}
          exit={{
            opacity: 0,
            flexGrow: 0,
            width: 0,
            transition: {
              opacity: { duration: 0.1 },
              width: SIDEBAR_TRANSITION,
              flexGrow: SIDEBAR_TRANSITION,
            },
          }}
          className={className}
          style={{
            display: 'flex',
            flexBasis: 'auto',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function getFlyoutTop(triggerRect: DOMRect): number {
  const preferredTop = triggerRect.top - 16;
  const maxTop = window.innerHeight - FLYOUT_HEIGHT - 12;

  return Math.max(12, Math.min(preferredTop, maxTop));
}

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { open, isMobile, setOpenMobile } = useSidebar();
  const { user, signOut } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [openViolationCount, setOpenViolationCount] = React.useState(0);
  const activeDisease = getActiveDisease(location.pathname);
  const activeControl = getActiveControl(location.pathname);
  const [expandedDisease, setExpandedDisease] = React.useState<DiseaseSlug | null>(activeDisease);
  const [floatingDisease, setFloatingDisease] = React.useState<FloatingDiseaseState | null>(null);
  const showFlyoutTimer = React.useRef<number | null>(null);
  const hideFlyoutTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  React.useEffect(() => {
    let isCancelled = false;

    const loadSidebarMeta = async () => {
      const allViolations = await getAllViolations();

      if (isCancelled) {
        return;
      }

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

  React.useEffect(() => {
    setExpandedDisease(activeDisease);
  }, [activeDisease]);

  React.useEffect(() => {
    if (open || isMobile) {
      setFloatingDisease(null);
    }
  }, [isMobile, open]);

  React.useEffect(() => {
    return () => {
      if (showFlyoutTimer.current !== null) {
        window.clearTimeout(showFlyoutTimer.current);
      }

      if (hideFlyoutTimer.current !== null) {
        window.clearTimeout(hideFlyoutTimer.current);
      }
    };
  }, []);

  const clearFlyoutTimers = () => {
    if (showFlyoutTimer.current !== null) {
      window.clearTimeout(showFlyoutTimer.current);
      showFlyoutTimer.current = null;
    }

    if (hideFlyoutTimer.current !== null) {
      window.clearTimeout(hideFlyoutTimer.current);
      hideFlyoutTimer.current = null;
    }
  };

  const closeFloatingDisease = () => {
    clearFlyoutTimers();
    setFloatingDisease(null);
  };

  const openFloatingDisease = (
    disease: DiseaseRouteConfig,
    displayName: string,
    triggerElement: HTMLElement,
    delay = 100,
  ) => {
    clearFlyoutTimers();

    showFlyoutTimer.current = window.setTimeout(() => {
      const triggerRect = triggerElement.getBoundingClientRect();

      setFloatingDisease({
        disease,
        displayName,
        top: getFlyoutTop(triggerRect),
      });
    }, delay);
  };

  const scheduleFloatingDiseaseClose = () => {
    if (showFlyoutTimer.current !== null) {
      window.clearTimeout(showFlyoutTimer.current);
      showFlyoutTimer.current = null;
    }

    if (hideFlyoutTimer.current !== null) {
      window.clearTimeout(hideFlyoutTimer.current);
    }

    hideFlyoutTimer.current = window.setTimeout(() => {
      setFloatingDisease(null);
    }, 120);
  };

  const handleDiseaseToggle = (disease: DiseaseSlug) => {
    setExpandedDisease((currentDisease) => (currentDisease === disease ? null : disease));
  };

  const handleDiseaseButtonClick = (
    disease: DiseaseRouteConfig,
    displayName: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (!open && !isMobile) {
      openFloatingDisease(disease, displayName, event.currentTarget, 0);
      return;
    }

    handleDiseaseToggle(disease.slug);
  };

  const handleSidebarNavigate = (href: string) => {
    navigate(href);

    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    await signOut();

    if (isMobile) {
      setOpenMobile(false);
    }

    navigate('/login');
  };

  const currentUserName = user?.name ?? 'QC Pulse User';
  const currentRole = user?.role ?? 'Analyst';
  const currentUserInitials = user?.initials ?? 'QC';
  const isCollapsedDesktop = !open && !isMobile;
  const floatingDiseaseSlug = floatingDisease?.disease.slug ?? null;

  const accountMenuItems: Array<{
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    href?: string;
    badge?: string;
    disabled?: boolean;
  }> = [
    {
      label: 'Reports',
      icon: ChartBarIcon,
      badge: 'New',
      disabled: true,
    },
    {
      label: 'History / Audit Log',
      icon: ClockIcon,
      href: '/history',
    },
    {
      label: 'Violations',
      icon: WarningIcon,
      href: '/violations',
    },
    {
      label: 'Notifications',
      icon: BellIcon,
      badge: 'New',
      disabled: true,
    },
    {
      label: 'Settings',
      icon: GearIcon,
      href: '/settings',
    },
  ];

  const handleAccountMenuNavigate = (href?: string) => {
    if (href !== undefined) {
      handleSidebarNavigate(href);
    }
  };

  const accountMenuContent = (
    <DropdownMenuContent
      align={isCollapsedDesktop ? 'start' : 'end'}
      side={isCollapsedDesktop ? 'right' : 'top'}
      sideOffset={8}
      className="z-[70] w-64 rounded-[1.15rem] border border-[#e5e7eb] bg-white p-1.5 shadow-[0_16px_38px_rgba(15,23,42,0.12)]"
    >
      <div className="rounded-[0.95rem] bg-[#f8fafc] px-2.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-blue)] text-xs font-semibold text-white">
            {currentUserInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#111827]">{currentUserName}</p>
            <Badge
              variant="secondary"
              className="mt-1 h-4 rounded-full border-[#dbeafe] bg-[#eff6ff] px-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-blue)]"
            >
              {currentRole}
            </Badge>
          </div>
          <ArrowRightIcon size={14} className="text-[#94a3b8]" />
        </div>
      </div>

      <DropdownMenuSeparator className="mx-1 my-2 bg-[#e5e7eb]" />

      {accountMenuItems.map((item) => {
        const Icon = item.icon;

        return (
          <DropdownMenuItem
            key={item.label}
            disabled={item.disabled}
            onSelect={() => handleAccountMenuNavigate(item.href)}
            className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#111827] data-[disabled]:opacity-55"
          >
            <Icon size={16} className="text-[#475569]" />
            <span>{item.label}</span>
            {item.badge ? (
              <Badge
                variant="secondary"
                className="ml-auto h-4.5 rounded-full border-[#dbeafe] bg-[#eff6ff] px-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-blue)]"
              >
                {item.badge}
              </Badge>
            ) : null}
          </DropdownMenuItem>
        );
      })}

      <DropdownMenuSeparator className="mx-1 my-2 bg-[#e5e7eb]" />

      <DropdownMenuItem
        onSelect={handleLogout}
        className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#111827]"
      >
        <SignOutIcon size={16} className="text-[#475569]" />
        <span>Log out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <TooltipProvider>
      <Sidebar variant="sidebar" collapsible="icon" className={cn(!mounted && 'no-transition')}>
        <SidebarHeader className="pr-12">
          {(open || isMobile) && (
            <SidebarTooltip label="QC Pulse">
              <button
                type="button"
                onClick={() => handleSidebarNavigate('/monitor')}
                className="flex w-full items-center justify-start rounded-xl px-2 py-2 transition"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-[#e5e7eb]">
                  <img
                    src="/images/brand-logo.png"
                    alt="QC Pulse brand logo"
                    className="h-full w-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                </div>
                <SidebarAnimatedLabel
                  className="ml-3 flex min-w-0 flex-col overflow-hidden whitespace-nowrap text-left [--sidebar-label-width:11rem]"
                >
                  <p className="text-[15px] font-bold tracking-[0.01em] text-[var(--brand-blue)]">QC PULSE</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
                    Laboratory System
                  </p>
                </SidebarAnimatedLabel>
              </button>
            </SidebarTooltip>
          )}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>DISEASE LIST</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {DISEASE_ROUTE_CONFIG.map((disease) => {
                  const Icon = disease.icon;
                  const isCurrentDisease = activeDisease === disease.slug;
                  const isOpen = expandedDisease === disease.slug;
                  const diseaseDisplayName =
                    DISEASE_DEFINITIONS.find((item) => item.slug === disease.slug)?.name ?? disease.name;
                  const diseaseAccent = DISEASE_ACCENTS[disease.slug];
                  const diseaseMenuButton = (
                    <SidebarMenuButton
                      type="button"
                      isActive={isCurrentDisease && !isCollapsedDesktop}
                      title={diseaseDisplayName}
                      aria-expanded={isCollapsedDesktop ? floatingDiseaseSlug === disease.slug : isOpen}
                      onClick={(event) => handleDiseaseButtonClick(disease, diseaseDisplayName, event)}
                      onMouseEnter={(event) => {
                        if (isCollapsedDesktop) {
                          openFloatingDisease(disease, diseaseDisplayName, event.currentTarget);
                        }
                      }}
                      onMouseLeave={() => {
                        if (isCollapsedDesktop) {
                          scheduleFloatingDiseaseClose();
                        }
                      }}
                      className={cn(
                        isCollapsedDesktop && 'mx-auto h-10 w-10 rounded-lg p-0',
                        isCollapsedDesktop &&
                          isCurrentDisease &&
                          'bg-[#eff6ff] text-[var(--sidebar-accent-foreground)] hover:bg-[#eff6ff]',
                        !isCollapsedDesktop && 'justify-between',
                      )}
                    >
                      {isCollapsedDesktop ? (
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={
                            isCurrentDisease
                              ? {
                                  color: diseaseAccent,
                                  boxShadow: `0 0 0 2px #ffffff, 0 0 0 3px ${diseaseAccent}`,
                                }
                              : { color: '#334155' }
                          }
                        >
                          <Icon size={17} />
                        </span>
                      ) : (
                        <span className="flex min-w-0 flex-1 items-center">
                          <Icon size={17} className="shrink-0" />
                          <SidebarAnimatedLabel
                            className="ml-2 flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap [--sidebar-label-width:11rem]"
                          >
                            <span className="truncate">{diseaseDisplayName}</span>
                          </SidebarAnimatedLabel>
                        </span>
                      )}
                      {!isCollapsedDesktop ? (
                        <span className="ml-auto flex h-4 w-4 flex-none items-center justify-center">
                          <CaretDownIcon
                            size={16}
                            className={cn(
                              'h-4 w-4 flex-none origin-center transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
                              isOpen && 'rotate-180',
                            )}
                          />
                        </span>
                      ) : null}
                    </SidebarMenuButton>
                  );

                  return (
                    <SidebarMenuItem key={disease.slug}>
                      {isCollapsedDesktop ? diseaseMenuButton : (
                        <SidebarTooltip label={diseaseDisplayName}>{diseaseMenuButton}</SidebarTooltip>
                      )}

                      <AnimatePresence initial={false}>
                        {isOpen && (open || isMobile) ? (
                          <motion.div
                            key="submenu"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{
                              height: 'auto',
                              opacity: 1,
                              transition: {
                                height: SIDEBAR_TRANSITION,
                                opacity: { duration: 0.2, delay: 0.05 },
                              },
                            }}
                            exit={{
                              height: 0,
                              opacity: 0,
                              transition: {
                                height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                                opacity: { duration: 0.1 },
                              },
                            }}
                            style={{ overflow: 'hidden' }}
                          >
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
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
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
                          className={!open && !isMobile ? 'mx-auto h-10 w-10 rounded-2xl p-0' : undefined}
                        >
                          <Icon size={17} className="shrink-0" />
                          <SidebarAnimatedLabel
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
                          </SidebarAnimatedLabel>
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
              <DropdownMenu modal={false}>
                <SidebarTooltip label={`${currentUserName} - ${currentRole}`}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-[var(--brand-blue)] text-xs font-semibold text-white"
                    >
                      {currentUserInitials}
                    </button>
                  </DropdownMenuTrigger>
                </SidebarTooltip>
                {accountMenuContent}
              </DropdownMenu>
            </div>
          ) : (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="mt-2 flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-1.5 text-left transition hover:bg-[#f8fafc]"
                >
                  <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-blue)] text-xs font-semibold text-white">
                    {currentUserInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#111827]">{currentUserName}</p>
                    <Badge
                      variant="secondary"
                      className="mt-1 h-4 rounded-full border-[#dbeafe] bg-[#eff6ff] px-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-blue)]"
                    >
                      {currentRole}
                    </Badge>
                  </div>
                </button>
              </DropdownMenuTrigger>
              {accountMenuContent}
            </DropdownMenu>
          )}
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {typeof document === 'undefined'
        ? null
        : createPortal(
            <AnimatePresence initial={false}>
              {floatingDisease !== null && isCollapsedDesktop ? (
                <>
                  <div
                    aria-hidden="true"
                    className="fixed z-40"
                    style={{
                      left: 58,
                      top: floatingDisease.top,
                      width: FLYOUT_LEFT - 58,
                      height: FLYOUT_HEIGHT,
                    }}
                    onMouseEnter={clearFlyoutTimers}
                    onMouseLeave={scheduleFloatingDiseaseClose}
                  />
                  <motion.div
                    key={floatingDisease.disease.slug}
                    initial={{ opacity: 0, x: -8, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -8, scale: 0.96 }}
                    transition={FLYOUT_ANIMATION}
                    className="fixed z-50 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                    style={{
                      left: FLYOUT_LEFT,
                      top: floatingDisease.top,
                      width: FLYOUT_WIDTH,
                      transformOrigin: 'left center',
                    }}
                    onMouseEnter={clearFlyoutTimers}
                    onMouseLeave={scheduleFloatingDiseaseClose}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <span
                        className="inline-flex h-7 min-w-10 items-center justify-center rounded-lg px-2 text-[11px] font-bold tracking-[0.08em] text-white"
                        style={{ backgroundColor: DISEASE_ACCENTS[floatingDisease.disease.slug] }}
                      >
                        {DISEASE_BADGES[floatingDisease.disease.slug]}
                      </span>
                      <span className="min-w-0 truncate text-sm font-semibold text-[#111827]">
                        {floatingDisease.displayName}
                      </span>
                    </div>
                    <div className="mx-3 h-px bg-[#e5e7eb]" />
                    <div className="py-2">
                      {CONTROL_LINKS.map((control) => {
                        const href = `/monitor/${floatingDisease.disease.slug}/${control.slug}`;
                        const isActiveControl =
                          activeDisease === floatingDisease.disease.slug && activeControl === control.slug;

                        return (
                          <button
                            key={control.slug}
                            type="button"
                            onClick={() => {
                              navigate(href);
                              closeFloatingDisease();
                            }}
                            className={cn(
                              'group/flyout flex h-10 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-medium transition-colors',
                              isActiveControl
                                ? 'bg-[#eff6ff] text-[var(--brand-blue)]'
                                : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[var(--brand-blue)]',
                            )}
                          >
                            <span>{control.label} Control</span>
                            <ArrowRightIcon
                              size={15}
                              className="opacity-0 transition-opacity group-hover/flyout:opacity-100"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>,
            document.body,
          )}
    </TooltipProvider>
  );
}
