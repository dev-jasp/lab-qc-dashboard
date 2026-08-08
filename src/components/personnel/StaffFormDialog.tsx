import { useEffect, useState } from 'react';

import { StaffAvatar } from '@/components/personnel/StaffAvatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  deriveInitials,
  SHIFT_HOURS,
  SHIFT_LABELS,
  sortWeekdays,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
} from '@/lib/staffDirectory';
import type { DutyShift, StaffMember, StaffRole, Weekday } from '@/types/qc.types';
import { cn } from '@/utils/cn';

const FIELD_CLASS_NAME = 'h-11 border-[#dce4f2] bg-white px-3';

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'analyst', label: 'Analyst' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'admin', label: 'Admin' },
];

const SHIFT_OPTIONS: DutyShift[] = ['morning', 'mid', 'night', 'rotating'];

/**
 * Deliberately loose: enough to catch a fat-fingered address without rejecting
 * the institutional formats a lab actually uses.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type StaffFormValues = {
  staffId: string;
  displayName: string;
  initials: string;
  role: StaffRole;
  contactNumber: string;
  email: string;
  photoUrl: string;
  shift: DutyShift;
  dutyDays: Weekday[];
  notes: string;
};

export interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing record to edit, or null to add someone new. */
  member: StaffMember | null;
  onInvalid: (message: string) => void;
  /** Resolve truthy to close the dialog and reset the form. */
  onSubmit: (values: StaffFormValues) => Promise<boolean> | boolean;
}

function createEmptyForm(): StaffFormValues {
  return {
    staffId: '',
    displayName: '',
    initials: '',
    role: 'analyst',
    contactNumber: '',
    email: '',
    photoUrl: '',
    shift: 'morning',
    dutyDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    notes: '',
  };
}

function toFormValues(member: StaffMember): StaffFormValues {
  return {
    staffId: member.staffId,
    displayName: member.displayName,
    initials: member.initials,
    role: member.role,
    contactNumber: member.contactNumber ?? '',
    email: member.email ?? '',
    photoUrl: member.photoUrl ?? '',
    shift: member.shift,
    dutyDays: member.dutyDays,
    notes: member.notes ?? '',
  };
}

/**
 * Add/edit form for a personnel record. Shared by the roster page and the
 * quick-add inside the entry form's staff picker; each caller owns its own
 * post-submit side effects.
 */
export function StaffFormDialog({
  open,
  onOpenChange,
  member,
  onInvalid,
  onSubmit,
}: StaffFormDialogProps) {
  const [values, setValues] = useState<StaffFormValues>(createEmptyForm);
  // Initials follow the name until the user takes them over.
  const [hasTouchedInitials, setHasTouchedInitials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = member !== null;

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues(member === null ? createEmptyForm() : toFormValues(member));
    setHasTouchedInitials(member !== null);
  }, [open, member]);

  const handleNameChange = (displayName: string) => {
    setValues((current) => ({
      ...current,
      displayName,
      initials: hasTouchedInitials ? current.initials : deriveInitials(displayName),
    }));
  };

  const toggleDutyDay = (day: Weekday) => {
    setValues((current) => ({
      ...current,
      dutyDays: current.dutyDays.includes(day)
        ? current.dutyDays.filter((existing) => existing !== day)
        : sortWeekdays([...current.dutyDays, day]),
    }));
  };

  const handleSubmit = async () => {
    const staffId = values.staffId.trim();
    const displayName = values.displayName.trim();
    const email = values.email.trim();

    if (!displayName) {
      onInvalid('Full name is required.');
      return;
    }

    if (!staffId) {
      onInvalid('Staff ID is required.');
      return;
    }

    if (email !== '' && !EMAIL_PATTERN.test(email)) {
      onInvalid('Enter a valid email address, or leave it blank.');
      return;
    }

    setIsSubmitting(true);
    try {
      const didSucceed = await onSubmit({
        staffId,
        displayName,
        initials: values.initials.trim() || deriveInitials(displayName),
        role: values.role,
        contactNumber: values.contactNumber.trim(),
        email,
        photoUrl: values.photoUrl.trim(),
        shift: values.shift,
        dutyDays: sortWeekdays(values.dutyDays),
        notes: values.notes.trim(),
      });

      if (didSucceed) {
        onOpenChange(false);
        setValues(createEmptyForm());
        setHasTouchedInitials(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit person' : 'Add person'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this personnel record. Recorded runs keep their existing attribution.'
              : 'Add a member of lab personnel so they can be attributed to QC runs.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1C1C]">Full name</label>
            <Input
              value={values.displayName}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="e.g. J. Santos"
              className={FIELD_CLASS_NAME}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1C1C]">Staff ID</label>
              <Input
                value={values.staffId}
                onChange={(event) =>
                  setValues((current) => ({ ...current, staffId: event.target.value }))
                }
                placeholder="e.g. MT-0142"
                className={FIELD_CLASS_NAME}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1C1C]">Initials</label>
              <Input
                value={values.initials}
                maxLength={4}
                onChange={(event) => {
                  setHasTouchedInitials(true);
                  setValues((current) => ({
                    ...current,
                    initials: event.target.value.toUpperCase(),
                  }));
                }}
                placeholder="JS"
                className={FIELD_CLASS_NAME}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1C1C]">Contact number</label>
              <Input
                value={values.contactNumber}
                onChange={(event) =>
                  setValues((current) => ({ ...current, contactNumber: event.target.value }))
                }
                placeholder="e.g. +63 917 812 4470"
                className={FIELD_CLASS_NAME}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1C1C]">Email</label>
              <Input
                type="email"
                value={values.email}
                onChange={(event) =>
                  setValues((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="e.g. j.santos@zcmc.doh.gov.ph"
                className={FIELD_CLASS_NAME}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1C1C]">Photo</label>
            <div className="flex items-center gap-3">
              <StaffAvatar
                initials={values.initials || deriveInitials(values.displayName)}
                isActive
                photoUrl={values.photoUrl}
              />
              <Input
                value={values.photoUrl}
                onChange={(event) =>
                  setValues((current) => ({ ...current, photoUrl: event.target.value }))
                }
                placeholder="/staff/j-santos.jpg"
                className={`${FIELD_CLASS_NAME} flex-1`}
              />
            </div>
            <p className="text-[12px] text-[#9ca3af]">
              Path to an image in public/staff/, or a data URI. Leave blank to use initials.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1C1C]">Role</label>
            <Select
              value={values.role}
              onValueChange={(value) =>
                setValues((current) => ({ ...current, role: value as StaffRole }))
              }
            >
              <SelectTrigger className={FIELD_CLASS_NAME}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[12px] text-[#9ca3af]">
              A roster designation for filtering. It does not grant app permissions.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1C1C]">Shift</label>
            <Select
              value={values.shift}
              onValueChange={(value) =>
                setValues((current) => ({ ...current, shift: value as DutyShift }))
              }
            >
              <SelectTrigger className={FIELD_CLASS_NAME}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {`${SHIFT_LABELS[option]} · ${SHIFT_HOURS[option]}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1C1C]">Duty days</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_ORDER.map((day) => {
                const isSelected = values.dutyDays.includes(day);

                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleDutyDay(day)}
                    className={cn(
                      'h-9 min-w-12 rounded-full border px-3 text-[13px] font-semibold transition-colors',
                      isSelected
                        ? 'border-[#1a1aff] bg-[#eef2ff] text-[#1a1aff]'
                        : 'border-[#dbe3ef] bg-white text-[#6b7280] hover:bg-[#f8fafc]',
                    )}
                  >
                    {WEEKDAY_LABELS[day]}
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-[#9ca3af]">
              Leave all unselected for staff with no fixed days.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1C1C]">Notes</label>
            <Textarea
              value={values.notes}
              onChange={(event) =>
                setValues((current) => ({ ...current, notes: event.target.value }))
              }
              rows={3}
              maxLength={200}
              placeholder="Optional notes"
              className="resize-none border-[#dce4f2] bg-white px-3 py-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
            {isEditing ? 'Save changes' : 'Add person'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
