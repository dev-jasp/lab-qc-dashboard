import { ArrowLeftIcon, PencilIcon } from '@phosphor-icons/react';
import { format, parseISO } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { StaffFormDialog, type StaffFormValues } from '@/components/personnel/StaffFormDialog';
import { StaffAvatar } from '@/components/personnel/StaffAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { controlTypeToTabSlug } from '@/constants/monitor-config';
import { useToast } from '@/hooks/useToast';
import { useGetStaffDirectoryQuery } from '@/store/api/overviewEndpoints';
import { useUpdateStaffMemberMutation } from '@/store/api/settingsEndpoints';
import {
  formatDutyDays,
  ROLE_LABELS,
  SHIFT_HOURS,
  SHIFT_LABELS,
} from '@/lib/staffDirectory';

const HEAD_CLASS_NAME =
  'h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]';
const CELL_CLASS_NAME = 'py-4 text-[14px] text-[#374151]';

function formatDateLabel(value: string | null): string {
  if (value === null) {
    return '—';
  }

  try {
    return format(parseISO(value.slice(0, 10)), 'MMM dd, yyyy');
  } catch {
    return value;
  }
}

function DetailField({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | null;
  hint?: string;
  href?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
        {label}
      </p>
      {value === null || value === '' ? (
        <p className="mt-1.5 text-[14px] text-[#9ca3af]">Not on file</p>
      ) : href === undefined ? (
        <p className="mt-1.5 truncate text-[14px] text-[#111827]">{value}</p>
      ) : (
        <a
          href={href}
          className="mt-1.5 block truncate text-[14px] font-medium text-[#1a1aff] hover:underline"
        >
          {value}
        </a>
      )}
      {hint !== undefined && <p className="mt-1 text-[12px] text-[#9ca3af]">{hint}</p>}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 py-1 text-left xl:border-l xl:border-[#e5e7eb] xl:pl-5 xl:first:border-l-0 xl:first:pl-0">
      <p className="text-[11px] uppercase tracking-[0.05em] text-[#6b7280]">{label}</p>
      <p className="mt-2 text-[22px] font-bold leading-none text-[#111827]">{value}</p>
    </div>
  );
}

export function StaffProfile() {
  const { staffId } = useParams();
  const { data: loadedRecords, isLoading } = useGetStaffDirectoryQuery();
  const [updateStaffMemberMutation] = useUpdateStaffMemberMutation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const navigate = useNavigate();
  const { success, error } = useToast();

  // Still null while loading so the "not found" branch does not flash before the
  // roster arrives; the page shares one cache entry with the personnel list.
  const records = useMemo(
    () => (isLoading ? null : (loadedRecords ?? [])),
    [isLoading, loadedRecords],
  );

  const record = useMemo(
    () => records?.find((candidate) => candidate.id === staffId) ?? null,
    [records, staffId],
  );

  const handleSubmit = useCallback(
    async (values: StaffFormValues): Promise<boolean> => {
      if (record === null) {
        return false;
      }

      try {
        await updateStaffMemberMutation({
          memberId: record.id,
          updates: {
            staffId: values.staffId,
            displayName: values.displayName,
            initials: values.initials,
            role: values.role,
            contactNumber: values.contactNumber ? values.contactNumber : null,
            email: values.email ? values.email : null,
            photoUrl: values.photoUrl ? values.photoUrl : null,
            shift: values.shift,
            dutyDays: values.dutyDays,
            notes: values.notes ? values.notes : null,
          },
        }).unwrap();
        success(`${values.displayName} updated.`);
        return true;
      } catch (caughtError) {
        error(
          caughtError instanceof Error ? caughtError.message : 'Unable to save the record.',
        );
        return false;
      }
    },
    [error, record, success, updateStaffMemberMutation],
  );

  if (records === null) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-12 text-center text-sm text-[#6b7280]">
        Loading profile...
      </div>
    );
  }

  if (record === null) {
    return <Navigate to="/personnel" replace />;
  }

  const { activity } = record;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <Link
          to="/personnel"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6b7280] hover:text-[#111827]"
        >
          <ArrowLeftIcon size={14} />
          Personnel
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <StaffAvatar
              initials={record.initials}
              isActive={record.isActive}
              photoUrl={record.photoUrl}
            />
            <div>
              <h1 className="text-3xl font-bold text-[#111827]">{record.displayName}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#6b7280]">
                <span>{record.staffId}</span>
                <span>·</span>
                <span>{ROLE_LABELS[record.role]}</span>
                <Badge
                  className={
                    record.isActive
                      ? 'bg-[#dcfce7] text-[#16a34a]'
                      : 'bg-[#f3f4f6] text-[#6b7280]'
                  }
                >
                  {record.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsFormOpen(true)}
            className="h-9 shrink-0 gap-1.5 rounded-full border-[#dbe4ff] text-[13px] font-semibold text-[#1a1aff]"
          >
            <PencilIcon size={15} />
            Edit
          </Button>
        </div>

        {record.notes !== null && record.notes !== '' && (
          <p className="mt-4 rounded-xl border border-[#dbe3ef] bg-[#f8fafc] px-4 py-3 text-[13px] text-[#374151]">
            {record.notes}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <h2 className="mb-5 text-[16px] font-semibold text-[#111827]">Contact &amp; schedule</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <DetailField
            label="Contact number"
            value={record.contactNumber}
            href={
              record.contactNumber === null
                ? undefined
                : `tel:${record.contactNumber.replace(/[^+\d]/g, '')}`
            }
          />
          <DetailField
            label="Email"
            value={record.email}
            href={record.email === null ? undefined : `mailto:${record.email}`}
          />
          <DetailField
            label="Shift"
            value={SHIFT_LABELS[record.shift]}
            hint={SHIFT_HOURS[record.shift]}
          />
          <DetailField label="Duty days" value={formatDutyDays(record.dutyDays)} />
        </div>
      </div>

      <div className="rounded-2xl border border-[#f0f0f0] bg-white px-6 py-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <div className="grid w-full grid-cols-2 gap-4 xl:grid-cols-4">
          <StatTile label="Runs recorded" value={String(activity.runCount)} />
          <StatTile label="Streams worked" value={String(activity.streams.length)} />
          <StatTile label="Last active" value={formatDateLabel(activity.lastRunDate)} />
          <StatTile label="On roster since" value={formatDateLabel(record.createdAt)} />
        </div>
      </div>

      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <h2 className="mb-5 text-[16px] font-semibold text-[#111827]">Activity by control stream</h2>
        {activity.streams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-8 text-center text-sm text-[#6b7280]">
            No runs recorded yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#eef2f7] hover:bg-transparent">
                <TableHead className={HEAD_CLASS_NAME}>Disease</TableHead>
                <TableHead className={HEAD_CLASS_NAME}>Control</TableHead>
                <TableHead className={HEAD_CLASS_NAME}>Lot / Batch</TableHead>
                <TableHead className={HEAD_CLASS_NAME}>Runs</TableHead>
                <TableHead className={HEAD_CLASS_NAME}>Last run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.streams.map((stream) => (
                <TableRow
                  key={`${stream.disease}:${stream.controlType}:${stream.partitionId}`}
                  className="cursor-pointer border-[#eef2f7] bg-white hover:bg-[#f8fafc]"
                  onClick={() =>
                    navigate(
                      `/monitor/${stream.disease}/${controlTypeToTabSlug(stream.controlType)}`,
                    )
                  }
                >
                  <TableCell className="py-4 text-[14px] font-medium text-[#111827]">
                    {stream.diseaseName}
                  </TableCell>
                  <TableCell className={CELL_CLASS_NAME}>{stream.controlShortLabel}</TableCell>
                  <TableCell className={CELL_CLASS_NAME}>{stream.partitionId}</TableCell>
                  <TableCell className={CELL_CLASS_NAME}>{stream.runCount}</TableCell>
                  <TableCell className={CELL_CLASS_NAME}>
                    {formatDateLabel(stream.lastRunDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {activity.recentRuns.length > 0 && (
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-[#111827]">Recent runs</h2>
            <span className="text-[13px] text-[#6b7280]">
              {`Showing ${activity.recentRuns.length} of ${activity.runCount}`}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-[#eef2f7] hover:bg-transparent">
                <TableHead className={HEAD_CLASS_NAME}>Date</TableHead>
                <TableHead className={HEAD_CLASS_NAME}>Disease</TableHead>
                <TableHead className={HEAD_CLASS_NAME}>Control</TableHead>
                <TableHead className={HEAD_CLASS_NAME}>Protocol</TableHead>
                <TableHead className={HEAD_CLASS_NAME}>OD</TableHead>
                <TableHead className={HEAD_CLASS_NAME}>Lot / Batch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.recentRuns.map((run) => (
                <TableRow
                  key={run.entry.id}
                  className="border-[#eef2f7] bg-white hover:bg-[#f8fafc]"
                >
                  <TableCell className={CELL_CLASS_NAME}>
                    {formatDateLabel(run.entry.date)}
                  </TableCell>
                  <TableCell className="py-4 text-[14px] font-medium text-[#111827]">
                    {run.diseaseName}
                  </TableCell>
                  <TableCell className={CELL_CLASS_NAME}>{run.controlShortLabel}</TableCell>
                  <TableCell className={CELL_CLASS_NAME}>{run.entry.protocolNumber}</TableCell>
                  <TableCell className={CELL_CLASS_NAME}>
                    {run.entry.odValue.toFixed(4)}
                  </TableCell>
                  <TableCell className={CELL_CLASS_NAME}>{run.partitionId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <StaffFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        member={record}
        onInvalid={error}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default StaffProfile;
