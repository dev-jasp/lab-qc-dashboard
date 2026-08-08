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
}

/**
 * Roster-backed picker for "Performed By".
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
        <SelectValue placeholder={hasStaff ? 'Select who ran this' : 'No personnel yet'} />
      </SelectTrigger>
      <SelectContent>
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
