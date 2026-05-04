import { BellIcon, QuestionIcon } from '@phosphor-icons/react';
import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { getControlDefinition, getDiseaseDefinition } from '@/constants/monitor-config';
import { getAllViolations } from '@/lib/qcStorage';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { SidebarTrigger } from '@/components/ui/sidebar';

type BreadcrumbSegment = {
  href?: string;
  label: string;
};

function formatControlLabel(slug: string | undefined): string | null {
  if (slug === undefined) {
    return null;
  }

  return getControlDefinition(slug)?.label.toUpperCase() ?? null;
}

function buildSegments(pathname: string): BreadcrumbSegment[] {
  if (pathname === '/history') {
    return [{ label: 'HISTORY' }];
  }

  if (pathname === '/violations') {
    return [{ label: 'VIOLATIONS' }];
  }

  if (pathname === '/settings') {
    return [{ label: 'SETTINGS' }];
  }

  if (pathname === '/monitor') {
    return [{ label: 'DASHBOARD', href: '/monitor' }];
  }

  const monitorDiseaseMatch = pathname.match(/^\/monitor\/([^/]+)$/);

  if (monitorDiseaseMatch !== null) {
    const diseaseName = getDiseaseDefinition(monitorDiseaseMatch[1])?.name.toUpperCase() ?? monitorDiseaseMatch[1].toUpperCase();

    return [
      { label: 'DASHBOARD', href: '/monitor' },
      { label: diseaseName },
    ];
  }

  const monitorControlMatch = pathname.match(/^\/monitor\/([^/]+)\/([^/]+)$/);

  if (monitorControlMatch !== null) {
    const diseaseSlug = monitorControlMatch[1];
    const controlSlug = monitorControlMatch[2];
    const diseaseName = getDiseaseDefinition(diseaseSlug)?.name.toUpperCase() ?? diseaseSlug.toUpperCase();
    const controlName = formatControlLabel(controlSlug) ?? controlSlug.toUpperCase();

    return [
      { label: 'DASHBOARD', href: '/monitor' },
      { label: diseaseName, href: `/monitor/${diseaseSlug}` },
      { label: controlName },
    ];
  }

  return [{ label: 'DASHBOARD', href: '/monitor' }];
}

export function DashboardHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openViolationCount, setOpenViolationCount] = React.useState(0);
  const segments = React.useMemo(() => buildSegments(location.pathname), [location.pathname]);
  const currentSegment = segments[segments.length - 1];
  const mobileParentSegment = segments.length > 2 ? segments[segments.length - 2] : null;

  React.useEffect(() => {
    let isCancelled = false;

    const loadOpenViolationCount = async () => {
      const allViolations = await getAllViolations();

      if (isCancelled) {
        return;
      }

      setOpenViolationCount(
        allViolations.filter((violation) => !violation.acknowledged && violation.severity === 'rejection').length,
      );
    };

    void loadOpenViolationCount();

    const handleViolationRefresh = () => {
      void loadOpenViolationCount();
    };

    window.addEventListener('qc-violations-changed', handleViolationRefresh);

    return () => {
      isCancelled = true;
      window.removeEventListener('qc-violations-changed', handleViolationRefresh);
    };
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#f0f0f0] bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="lg:hidden" />

        <div className="min-w-0 lg:hidden">
          {mobileParentSegment !== null && (
            <p className="truncate text-[11px] font-medium uppercase leading-4 tracking-[0.14em] text-[#6b7280]">
              {mobileParentSegment.label}
            </p>
          )}
          <p className="truncate text-[12px] font-semibold uppercase leading-4 tracking-[0.14em] text-[#1a1aff]">
            {currentSegment.label}
          </p>
        </div>

        <Breadcrumb className="hidden lg:block">
          <BreadcrumbList className="gap-2 text-xs font-semibold tracking-[0.12em]">
            {segments.map((segment, index) => {
              const isLastSegment = index === segments.length - 1;

              return (
                <React.Fragment key={`${segment.label}-${index}`}>
                  <BreadcrumbItem>
                    {isLastSegment ? (
                      <BreadcrumbPage className="text-[13px] font-medium tracking-[0.12em] text-[#1a1aff]">
                        {segment.label}
                      </BreadcrumbPage>
                    ) : segment.href ? (
                      <BreadcrumbLink asChild className="text-[13px] font-medium tracking-[0.12em] text-[#6b7280]">
                        <Link to={segment.href}>{segment.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <span className="text-[13px] font-medium tracking-[0.12em] text-[#6b7280]">{segment.label}</span>
                    )}
                  </BreadcrumbItem>
                  {!isLastSegment && (
                    <BreadcrumbSeparator className="text-[#9ca3af]">
                      <span>{'>'}</span>
                    </BreadcrumbSeparator>
                  )}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/violations')}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827]"
        >
          <BellIcon size={20} />
          {openViolationCount > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#dc2626]" />}
          <span className="sr-only">Open violations</span>
        </button>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827]"
        >
          <QuestionIcon size={20} />
          <span className="sr-only">Help</span>
        </button>
      </div>
    </header>
  );
}
