import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  BellIcon,
  CaretDownIcon,
  ChartBarIcon,
  ClockIcon,
  GearIcon,
  SignOutIcon,
  StackIcon,
  VirusIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { Collapsible } from "radix-ui";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import * as React from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

import { DISEASE_DEFINITIONS } from "@/constants/monitor-config";
import { useAuth } from "@/hooks/useAuth";
import { getAllViolations } from "@/lib/qcStorage";
import type { DiseaseSlug } from "@/types/qc.types";
import { cn } from "@/utils/cn";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  { slug: "measles", name: "Measles", icon: VirusIcon },
  { slug: "rubella", name: "Rubella", icon: VirusIcon },
  { slug: "rotavirus", name: "Rotavirus", icon: VirusIcon },
  {
    slug: "japanese-encephalitis",
    name: "Japanese Encephalitis",
    icon: VirusIcon,
  },
  { slug: "dengue", name: "Dengue", icon: VirusIcon },
];

const SYSTEM_ROUTES: SystemRoute[] = [
  { href: "/history", icon: ClockIcon, label: "History" },
  { href: "/violations", icon: WarningIcon, label: "Violations" },
  { href: "/settings", icon: GearIcon, label: "Settings" },
];

const DISEASE_ACCENTS: Record<DiseaseSlug, string> = {
  measles: "#2563eb",
  rubella: "#db2777",
  rotavirus: "#ea580c",
  "japanese-encephalitis": "#7c3aed",
  dengue: "#0891b2",
};

const DISEASE_BADGES: Record<DiseaseSlug, string> = {
  measles: "MEA",
  rubella: "RUB",
  rotavirus: "ROT",
  "japanese-encephalitis": "JE",
  dengue: "DEN",
};

const SIDEBAR_TRANSITION: Transition = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1],
};

const FLYOUT_LEFT = 76;
const FLYOUT_WIDTH = 244;
const FLYOUT_HEIGHT = 280;
const FLYOUT_ANIMATION: Transition = {
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1],
};

function getActiveDisease(pathname: string): DiseaseSlug | null {
  const match = pathname.match(/^\/monitor\/([^/]+)/);

  if (match === null) {
    return null;
  }

  const slug = match[1] as DiseaseSlug;
  return DISEASE_ROUTE_CONFIG.some((disease) => disease.slug === slug)
    ? slug
    : null;
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
            width: "auto",
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
            display: "flex",
            flexBasis: "auto",
            overflow: "hidden",
            whiteSpace: "nowrap",
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
  const { open, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const { user, signOut } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [openViolationCount, setOpenViolationCount] = React.useState(0);
  const activeDisease = getActiveDisease(location.pathname);
  const [diseasesFlyoutTop, setDiseasesFlyoutTop] = React.useState<number | null>(null);
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
        allViolations.filter(
          (violation) =>
            !violation.acknowledged && violation.severity === "rejection",
        ).length,
      );
    };

    void loadSidebarMeta();

    const handleViolationRefresh = () => {
      void loadSidebarMeta();
    };

    window.addEventListener("qc-violations-changed", handleViolationRefresh);

    return () => {
      isCancelled = true;
      window.removeEventListener(
        "qc-violations-changed",
        handleViolationRefresh,
      );
    };
  }, [location.pathname]);

  React.useEffect(() => {
    if (open || isMobile) {
      setDiseasesFlyoutTop(null);
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

  const closeDiseasesFlyout = () => {
    clearFlyoutTimers();
    setDiseasesFlyoutTop(null);
  };

  const openDiseasesFlyout = (triggerElement: HTMLElement, delay = 100) => {
    clearFlyoutTimers();

    showFlyoutTimer.current = window.setTimeout(() => {
      const triggerRect = triggerElement.getBoundingClientRect();
      setDiseasesFlyoutTop(getFlyoutTop(triggerRect));
    }, delay);
  };

  const scheduleDiseasesFlyoutClose = () => {
    if (showFlyoutTimer.current !== null) {
      window.clearTimeout(showFlyoutTimer.current);
      showFlyoutTimer.current = null;
    }

    if (hideFlyoutTimer.current !== null) {
      window.clearTimeout(hideFlyoutTimer.current);
    }

    hideFlyoutTimer.current = window.setTimeout(() => {
      setDiseasesFlyoutTop(null);
    }, 120);
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

    navigate("/login");
  };

  const currentUserName = user?.name ?? "QC Pulse User";
  const currentUserEmail = user?.email ?? "demoaccount@gmail.com";
  const currentRole = user?.role ?? "Analyst";
  const currentUserInitials = user?.initials ?? "QC";
  const isCollapsedDesktop = !open && !isMobile;

  const accountMenuItems: Array<{
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    href?: string;
    badge?: string;
    disabled?: boolean;
  }> = [
    {
      label: "Reports",
      icon: ChartBarIcon,
      badge: "New",
      disabled: true,
    },
    {
      label: "History / Audit Log",
      icon: ClockIcon,
      href: "/history",
    },
    {
      label: "Violations",
      icon: WarningIcon,
      href: "/violations",
    },
    {
      label: "Notifications",
      icon: BellIcon,
      badge: "New",
      disabled: true,
    },
    {
      label: "Settings",
      icon: GearIcon,
      href: "/settings",
    },
  ];

  const handleAccountMenuNavigate = (href?: string) => {
    if (href !== undefined) {
      handleSidebarNavigate(href);
    }
  };

  const accountMenuContent = (
    <DropdownMenuContent
      align={isCollapsedDesktop ? "start" : "end"}
      side={isCollapsedDesktop ? "right" : "top"}
      sideOffset={8}
      className="z-[70] w-64 rounded-[1.15rem] border border-[#e5e7eb] bg-white p-1.5 shadow-[0_16px_38px_rgba(15,23,42,0.12)]"
    >
      <div className="rounded-[0.95rem] bg-[#f8fafc] px-2.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-blue)] text-xs font-semibold text-white">
            {currentUserInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#111827]">
              {currentUserName}
            </p>
            <Badge
              variant="secondary"
              className="mt-1 h-4 rounded-full border-[#dbeafe] bg-[#eff6ff] px-1.5 text-[9px] font-semibold text-[var(--brand-blue)]"
            >
              Access level: {currentRole}
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
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className={cn(!mounted && "no-transition")}
      >
        <SidebarHeader className="pr-12">
          {(open || isMobile) && (
            <SidebarTooltip label="QC Pulse">
              <button
                type="button"
                onClick={() => handleSidebarNavigate("/monitor")}
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
                <SidebarAnimatedLabel className="ml-3 flex min-w-0 flex-col overflow-hidden whitespace-nowrap text-left [--sidebar-label-width:11rem]">
                  <p className="text-[15px] font-bold tracking-[0.01em] text-[var(--brand-blue)]">
                    QC PULSE
                  </p>
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
            <SidebarGroupLabel>SURVEILLANCE PROGRAMS</SidebarGroupLabel>
            <SidebarGroupContent>
              {isCollapsedDesktop ? (
                // Collapsed icon mode: one icon per section
                <SidebarMenu>
                  {/* Diseases — hover for flyout, click to expand */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      type="button"
                      isActive={false}
                      onMouseEnter={(event) =>
                        openDiseasesFlyout(event.currentTarget)
                      }
                      onMouseLeave={scheduleDiseasesFlyoutClose}
                      onClick={toggleSidebar}
                      className={cn(
                        "mx-auto h-10 w-10 rounded-lg p-0",
                        activeDisease !== null &&
                          "bg-[#eff6ff] hover:bg-[#eff6ff]",
                      )}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          color:
                            activeDisease !== null
                              ? DISEASE_ACCENTS[activeDisease]
                              : "#334155",
                        }}
                      >
                        <VirusIcon size={17} />
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Exports — placeholder */}
                  <SidebarMenuItem>
                    <SidebarTooltip label="Exports">
                      <SidebarMenuButton
                        type="button"
                        isActive={false}
                        className="mx-auto h-10 w-10 rounded-lg p-0 opacity-40"
                      >
                        <ArrowSquareOutIcon size={17} className="text-[#334155]" />
                      </SidebarMenuButton>
                    </SidebarTooltip>
                  </SidebarMenuItem>

                  {/* Batches / Lots — placeholder */}
                  <SidebarMenuItem>
                    <SidebarTooltip label="Batches / Lots">
                      <SidebarMenuButton
                        type="button"
                        isActive={false}
                        className="mx-auto h-10 w-10 rounded-lg p-0 opacity-40"
                      >
                        <StackIcon size={17} className="text-[#334155]" />
                      </SidebarMenuButton>
                    </SidebarTooltip>
                  </SidebarMenuItem>
                </SidebarMenu>
              ) : (
                // Expanded mode: collapsible structure
                <SidebarMenu>
                  {/* Diseases — open by default */}
                  <SidebarMenuItem>
                    <Collapsible.Root className="group/diseases w-full" defaultOpen>
                      <Collapsible.Trigger asChild>
                        <SidebarMenuButton type="button">
                          <VirusIcon size={17} className="shrink-0" />
                          <span className="flex min-w-0 flex-1 items-center justify-between">
                            <span className="truncate">Diseases</span>
                            <CaretDownIcon
                              size={13}
                              className="shrink-0 transition-transform duration-200 group-data-[state=open]/diseases:rotate-180"
                            />
                          </span>
                        </SidebarMenuButton>
                      </Collapsible.Trigger>
                      <Collapsible.Content>
                        <SidebarMenuSub>
                          {DISEASE_ROUTE_CONFIG.map((disease) => {
                            const diseaseDisplayName =
                              DISEASE_DEFINITIONS.find(
                                (item) => item.slug === disease.slug,
                              )?.name ?? disease.name;
                            const isCurrentDisease =
                              activeDisease === disease.slug;

                            return (
                              <SidebarMenuSubItem key={disease.slug}>
                                <SidebarMenuSubButton
                                  type="button"
                                  isActive={isCurrentDisease}
                                  onClick={() =>
                                    handleSidebarNavigate(
                                      `/monitor/${disease.slug}/in-house`,
                                    )
                                  }
                                >
                                  {diseaseDisplayName}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </Collapsible.Content>
                    </Collapsible.Root>
                  </SidebarMenuItem>

                  {/* Exports — empty placeholder */}
                  <SidebarMenuItem>
                    <Collapsible.Root className="group/exports w-full">
                      <Collapsible.Trigger asChild>
                        <SidebarMenuButton type="button">
                          <ArrowSquareOutIcon size={17} className="shrink-0" />
                          <span className="flex min-w-0 flex-1 items-center justify-between">
                            <span className="truncate">Exports</span>
                            <CaretDownIcon
                              size={13}
                              className="shrink-0 transition-transform duration-200 group-data-[state=open]/exports:rotate-180"
                            />
                          </span>
                        </SidebarMenuButton>
                      </Collapsible.Trigger>
                      <Collapsible.Content />
                    </Collapsible.Root>
                  </SidebarMenuItem>

                  {/* Batches / Lots — empty placeholder */}
                  <SidebarMenuItem>
                    <Collapsible.Root className="group/batches w-full">
                      <Collapsible.Trigger asChild>
                        <SidebarMenuButton type="button">
                          <StackIcon size={17} className="shrink-0" />
                          <span className="flex min-w-0 flex-1 items-center justify-between">
                            <span className="truncate">Batches / Lots</span>
                            <CaretDownIcon
                              size={13}
                              className="shrink-0 transition-transform duration-200 group-data-[state=open]/batches:rotate-180"
                            />
                          </span>
                        </SidebarMenuButton>
                      </Collapsible.Trigger>
                      <Collapsible.Content />
                    </Collapsible.Root>
                  </SidebarMenuItem>
                </SidebarMenu>
              )}
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
                          route.label === "Violations" && openViolationCount > 0
                            ? `${route.label} (${openViolationCount})`
                            : route.label
                        }
                      >
                        <SidebarMenuButton
                          type="button"
                          isActive={isActive}
                          onClick={() => handleSidebarNavigate(route.href)}
                          title={route.label}
                          className={
                            !open && !isMobile
                              ? "mx-auto h-10 w-10 rounded-2xl p-0"
                              : undefined
                          }
                        >
                          <Icon size={17} className="shrink-0" />
                          <SidebarAnimatedLabel className="ml-2 flex min-w-0 flex-1 items-center justify-between overflow-hidden whitespace-nowrap [--sidebar-label-width:8.5rem]">
                            <span className="truncate">{route.label}</span>
                            {route.label === "Violations" &&
                            openViolationCount > 0 ? (
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
                <SidebarTooltip
                  label={`${currentUserName} - ${currentUserEmail}`}
                >
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
                    <p className="truncate text-[13px] font-semibold text-[#111827]">
                      {currentUserName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[#64748b]">
                      {currentUserEmail}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              {accountMenuContent}
            </DropdownMenu>
          )}
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {typeof document === "undefined"
        ? null
        : createPortal(
            <AnimatePresence initial={false}>
              {diseasesFlyoutTop !== null && isCollapsedDesktop ? (
                <>
                  {/* Invisible bridge keeps the flyout alive as the mouse moves from icon to panel */}
                  <div
                    aria-hidden="true"
                    className="fixed z-40"
                    style={{
                      left: 58,
                      top: diseasesFlyoutTop,
                      width: FLYOUT_LEFT - 58,
                      height: FLYOUT_HEIGHT,
                    }}
                    onMouseEnter={clearFlyoutTimers}
                    onMouseLeave={scheduleDiseasesFlyoutClose}
                  />
                  <motion.div
                    key="diseases-flyout"
                    initial={{ opacity: 0, x: -8, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -8, scale: 0.96 }}
                    transition={FLYOUT_ANIMATION}
                    className="fixed z-50 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                    style={{
                      left: FLYOUT_LEFT,
                      top: diseasesFlyoutTop,
                      width: FLYOUT_WIDTH,
                      transformOrigin: "left center",
                    }}
                    onMouseEnter={clearFlyoutTimers}
                    onMouseLeave={scheduleDiseasesFlyoutClose}
                  >
                    <div className="px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
                        Diseases
                      </p>
                    </div>
                    <div className="mx-3 mb-1 h-px bg-[#e5e7eb]" />
                    <div className="py-1">
                      {DISEASE_ROUTE_CONFIG.map((disease) => {
                        const diseaseDisplayName =
                          DISEASE_DEFINITIONS.find(
                            (item) => item.slug === disease.slug,
                          )?.name ?? disease.name;
                        const isCurrentDisease = activeDisease === disease.slug;

                        return (
                          <button
                            key={disease.slug}
                            type="button"
                            onClick={() => {
                              navigate(
                                `/monitor/${disease.slug}/in-house`,
                              );
                              closeDiseasesFlyout();
                            }}
                            className={cn(
                              "group/flyout-item flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium transition-colors",
                              isCurrentDisease
                                ? "bg-[#eff6ff] text-[var(--brand-blue)]"
                                : "text-[#475569] hover:bg-[#f8fafc] hover:text-[#111827]",
                            )}
                          >
                            <span
                              className="inline-flex h-5 min-w-8 shrink-0 items-center justify-center rounded-md px-1.5 text-[10px] font-bold tracking-[0.06em] text-white"
                              style={{
                                backgroundColor: DISEASE_ACCENTS[disease.slug],
                              }}
                            >
                              {DISEASE_BADGES[disease.slug]}
                            </span>
                            <span className="flex-1 truncate">
                              {diseaseDisplayName}
                            </span>
                            <ArrowRightIcon
                              size={13}
                              className="shrink-0 opacity-0 transition-opacity group-hover/flyout-item:opacity-50"
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
