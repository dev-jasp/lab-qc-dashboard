import { UserPlusIcon } from '@phosphor-icons/react';

import { StaffAvatar } from '@/components/personnel/StaffAvatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StaffMember } from '@/types/qc.types';

/** Sentinel option value — selecting it opens the quick-add dialog. */
const ADD_PERSON_VALUE = '__add_person__';

interface StaffPickerProps {
  staff: StaffMember[];
  valueId: string;
  onChange: (member: StaffMember | null) => void;
  onQuickAdd: () => void;
  disabled?: boolean;
  className?: string;
  /** Prompt shown when nobody is selected. */
  placeholder?: string;
}

/**
 * Roster-backed picker for the people attached to a run — who performed it,
 * and who attested it.
 *
 * Only active staff are offered, except that a currently-selected member who
 * has since been deactivated stays listed — otherwise editing an older entry
 * would silently blank its attribution.
 */
export function StaffPicker({
  staff,
  valueId,
  onChange,
  onQuickAdd,
  disabled = false,
  className,
  placeholder = 'Select who ran this',
}: StaffPickerProps) {
  const selectableStaff = staff.filter(
    (member) => member.isActive || member.id === valueId,
  );
  const hasStaff = selectableStaff.length > 0;

  return (
    <Select
      value={valueId === '' ? undefined : valueId}
      disabled={disabled}
      onValueChange={(nextValue) => {
        if (nextValue === ADD_PERSON_VALUE) {
          onQuickAdd();
          return;
        }

        onChange(staff.find((member) => member.id === nextValue) ?? null);
      }}
    >
      {/* SelectTrigger defaults to w-fit; the entry form needs full-width fields. */}
      <SelectTrigger className={`w-full ${className ?? ''}`}>
        <SelectValue placeholder={hasStaff ? placeholder : 'No personnel yet'} />
      </SelectTrigger>
      {/*
        The shared Select defaults to item-aligned, which lifts the list so the
        checked person sits on the trigger — over the field's own label. A
        roster this long makes that a big overlap, so this one anchors below the
        trigger and scrolls instead.
      */}
      <SelectContent position="popper" sideOffset={4}>
        {selectableStaff.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            <StaffAvatar
              initials={member.initials}
              isActive={member.isActive}
              photoUrl={member.photoUrl}
              size="sm"
            />
            {member.isActive ? member.displayName : `${member.displayName} (inactive)`}
          </SelectItem>
        ))}
        {hasStaff && <SelectSeparator />}
        <SelectItem value={ADD_PERSON_VALUE}>
          <UserPlusIcon size={15} />
          Add new person
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
