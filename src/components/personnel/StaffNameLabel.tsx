import { StaffAvatar } from '@/components/personnel/StaffAvatar';
import { deriveInitials, formatBenchName } from '@/lib/staffDirectory';
import type { StaffMember } from '@/types/qc.types';

interface StaffNameLabelProps {
  /** Display name mirrored onto the entry when it was recorded. */
  name: string | null;
  /** Joins to StaffMember.id. Null on legacy entries. */
  memberId: string | null;
  staff: StaffMember[];
  size?: 'sm' | 'md';
  /** Shown when the entry carries nobody. */
  emptyLabel?: string;
}

/**
 * Shows a person attached to a run — who performed it, or who attested it —
 * with their portrait.
 *
 * The name renders in bench format ("R. Delfin"), which is what the paper
 * worksheets carry and what the run tables are read against. The roster and
 * profile pages keep full names; this is the run-attribution spelling only.
 *
 * Legacy entries carry a free-text name and no id, so no roster record can be
 * found for them. Those still get an avatar — derived from the name — because
 * a missing one breaks the column's alignment, but it can never show a photo,
 * which is the honest result of not knowing who the person is.
 */
export function StaffNameLabel({
  name,
  memberId,
  staff,
  size = 'sm',
  emptyLabel = 'Not recorded',
}: StaffNameLabelProps) {
  const member =
    memberId === null || memberId === ''
      ? undefined
      : staff.find((candidate) => candidate.id === memberId);

  const resolvedName = name?.trim() ? name : (member?.displayName ?? null);

  if (resolvedName === null) {
    return <span className="text-[#9ca3af]">{emptyLabel}</span>;
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <StaffAvatar
        initials={member?.initials ?? deriveInitials(resolvedName)}
        isActive={member?.isActive ?? true}
        photoUrl={member?.photoUrl ?? null}
        size={size}
      />
      <span className="truncate">{formatBenchName(resolvedName)}</span>
    </span>
  );
}
