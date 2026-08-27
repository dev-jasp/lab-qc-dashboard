import { MagnifyingGlassIcon, UsersIcon, UserPlusIcon } from '@phosphor-icons/react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { StaffFormDialog, type StaffFormValues } from '@/components/personnel/StaffFormDialog';
import { StaffTable } from '@/components/personnel/StaffTable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { useGetStaffDirectoryQuery } from '@/store/api/overviewEndpoints';
import {
  useCreateStaffMemberMutation,
  useUpdateStaffMemberMutation,
} from '@/store/api/settingsEndpoints';
import { ROLE_LABELS, SHIFT_LABELS, type StaffRecord } from '@/lib/staffDirectory';
import type { DutyShift, StaffRole } from '@/types/qc.types';

/** Stable identity so the filter memo is not invalidated on every render. */
const EMPTY_RECORDS: StaffRecord[] = [];

const FILTER_TRIGGER_CLASS_NAME =
  'h-9 w-full rounded-full border-[#dbe3ef] bg-white px-4 text-[13px] font-semibold text-[#374151]';

const ROLE_FILTERS: (StaffRole | 'all')[] = ['all', 'analyst', 'supervisor', 'admin'];
const SHIFT_FILTERS: (DutyShift | 'all')[] = ['all', 'morning', 'mid', 'night', 'rotating'];

export function Personnel() {
  const { data: records = EMPTY_RECORDS, isLoading } = useGetStaffDirectoryQuery();
  const [createStaffMemberMutation] = useCreateStaffMemberMutation();
  const [updateStaffMemberMutation] = useUpdateStaffMemberMutation();
  const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all');
  const [shiftFilter, setShiftFilter] = useState<DutyShift | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffRecord | null>(null);
  const [pendingToggle, setPendingToggle] = useState<StaffRecord | null>(null);
  const navigate = useNavigate();
  const { success, error } = useToast();

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      if (roleFilter !== 'all' && record.role !== roleFilter) {
        return false;
      }

      if (shiftFilter !== 'all' && record.shift !== shiftFilter) {
        return false;
      }

      if (query === '') {
        return true;
      }

      return (
        record.displayName.toLowerCase().includes(query) ||
        record.staffId.toLowerCase().includes(query) ||
        (record.email?.toLowerCase().includes(query) ?? false) ||
        (record.contactNumber?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [records, roleFilter, search, shiftFilter]);

  const activeCount = records.filter((record) => record.isActive).length;
  const inactiveCount = records.length - activeCount;

  const handleSubmit = useCallback(
    async (values: StaffFormValues): Promise<boolean> => {
      const notes = values.notes ? values.notes : null;
      const contactNumber = values.contactNumber ? values.contactNumber : null;
      const email = values.email ? values.email : null;
      const photoUrl = values.photoUrl ? values.photoUrl : null;

      try {
        if (editingMember === null) {
          await createStaffMemberMutation({
            id: crypto.randomUUID(),
            staffId: values.staffId,
            displayName: values.displayName,
            initials: values.initials,
            role: values.role,
            contactNumber,
            email,
            photoUrl,
            shift: values.shift,
            dutyDays: values.dutyDays,
            isActive: true,
            notes,
            createdAt: new Date().toISOString(),
            updatedAt: null,
          }).unwrap();
          success(`${values.displayName} added to the roster.`);
        } else {
          await updateStaffMemberMutation({
            memberId: editingMember.id,
            updates: {
              staffId: values.staffId,
              displayName: values.displayName,
              initials: values.initials,
              role: values.role,
              contactNumber,
              email,
              photoUrl,
              shift: values.shift,
              dutyDays: values.dutyDays,
              notes,
            },
          }).unwrap();
          success(`${values.displayName} updated.`);
        }

        // No manual reload: both mutations invalidate the Staff tag, which is what
        // the directory query provides, so it refetches on its own.
        return true;
      } catch (caughtError) {
        error(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to save the personnel record.',
        );
        return false;
      }
    },
    [createStaffMemberMutation, editingMember, error, success, updateStaffMemberMutation],
  );

  const handleConfirmToggle = useCallback(async () => {
    if (pendingToggle === null) {
      return;
    }

    const record = pendingToggle;
    const nextActive = !record.isActive;

    try {
      await updateStaffMemberMutation({ memberId: record.id, updates: { isActive: nextActive } }).unwrap();
      success(`${record.displayName} ${nextActive ? 'reactivated' : 'deactivated'}.`);
    } catch (caughtError) {
      error(
        caughtError instanceof Error ? caughtError.message : 'Unable to update the record.',
      );
    } finally {
      setPendingToggle(null);
    }
  }, [error, pendingToggle, success, updateStaffMemberMutation]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
              Personnel
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[#111827]">Lab staff roster</h1>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#1a1aff]">
              <UsersIcon size={16} />
              {isLoading
                ? 'Loading roster...'
                : `${activeCount} active${inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ''}`}
            </div>
            <Button
              type="button"
              onClick={() => {
                setEditingMember(null);
                setIsFormOpen(true);
              }}
              className="h-9 gap-1.5 rounded-full bg-[#1a1aff] text-[13px] font-semibold text-white hover:bg-[#1515cc]"
            >
              <UserPlusIcon size={15} />
              Add person
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:max-w-lg">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                Role
              </p>
              <Select
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as StaffRole | 'all')}
              >
                <SelectTrigger className={FILTER_TRIGGER_CLASS_NAME}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_FILTERS.map((filter) => (
                    <SelectItem key={filter} value={filter}>
                      {filter === 'all' ? 'All roles' : ROLE_LABELS[filter]}
                      <span className="text-[#9ca3af]">
                        {filter === 'all'
                          ? records.length
                          : records.filter((record) => record.role === filter).length}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                Shift
              </p>
              <Select
                value={shiftFilter}
                onValueChange={(value) => setShiftFilter(value as DutyShift | 'all')}
              >
                <SelectTrigger className={FILTER_TRIGGER_CLASS_NAME}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_FILTERS.map((filter) => (
                    <SelectItem key={filter} value={filter}>
                      {filter === 'all' ? 'All shifts' : SHIFT_LABELS[filter]}
                      <span className="text-[#9ca3af]">
                        {filter === 'all'
                          ? records.length
                          : records.filter((record) => record.shift === filter).length}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative w-full xl:max-w-xs">
            <MagnifyingGlassIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
              size={16}
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, ID, email or number"
              className="h-9 rounded-full border-[#dbe3ef] bg-white pl-9 pr-4 text-[13px] text-[#111827] placeholder:text-[#9ca3af]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        {isLoading ? (
          <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-12 text-center text-sm text-[#6b7280]">
            Reading the roster...
          </div>
        ) : (
          <StaffTable
            records={visibleRecords}
            onViewProfile={(record) => navigate(`/personnel/${record.id}`)}
            onEdit={(record) => {
              setEditingMember(record);
              setIsFormOpen(true);
            }}
            onToggleActive={setPendingToggle}
            emptyMessage={
              records.length === 0
                ? 'Nobody on the roster yet. Add a person so QC runs can be attributed to them.'
                : 'No one matches this filter.'
            }
          />
        )}
      </div>

      <StaffFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        member={editingMember}
        onInvalid={error}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={pendingToggle !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingToggle(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.isActive ? 'Deactivate this person?' : 'Reactivate this person?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle === null
                ? ''
                : pendingToggle.isActive
                  ? `${pendingToggle.displayName} will stop appearing in the Performed By picker. Their ${pendingToggle.activity.runCount} recorded runs are kept and stay attributed to them.`
                  : `${pendingToggle.displayName} will appear in the Performed By picker again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmToggle}>
              {pendingToggle?.isActive ? 'Deactivate' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Personnel;
