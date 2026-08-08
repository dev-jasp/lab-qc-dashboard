import { StaffAvatar } from '@/components/personnel/StaffAvatar';
import { deriveInitials } from '@/lib/staffDirectory';
import type { StaffMember } from '@/types/qc.types';

interface PerformedByLabelProps {
  /** Display name mirrored onto the entry when it was recorded. */
  performedBy: string | null;
  /** Joins to StaffMember.id. Null on legacy entries. */
  performedById: string | null;
  staff: StaffMember[];
  size?: 'sm' | 'md';
}

/**
 * Shows who recorded a run, with their portrait.
 *
 * Legacy entries carry a free-text name and no id, so no roster record can be
 * found for them. Those still get an avatar — derived from the name — because
 * a missing one breaks the column's alignment, but it can never show a photo,
 * which is the honest result of not knowing who the person is.
 */
export function PerformedByLabel({
  performedBy,
  performedById,
  staff,
  size = 'sm',
}: PerformedByLabelProps) {
  const member =
    performedById === null || performedById === ''
      ? undefined
      : staff.find((candidate) => candidate.id === performedById);

  const name = performedBy?.trim() ? performedBy : (member?.displayName ?? null);

  if (name === null) {
    return <span className="text-[#9ca3af]">Not recorded</span>;
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <StaffAvatar
        initials={member?.initials ?? deriveInitials(name)}
        isActive={member?.isActive ?? true}
        photoUrl={member?.photoUrl ?? null}
        size={size}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
