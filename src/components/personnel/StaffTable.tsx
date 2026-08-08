import {
  ArrowRightIcon,
  DotsThreeIcon,
  PencilIcon,
  ProhibitIcon,
  ArrowCounterClockwiseIcon,
} from '@phosphor-icons/react';
import { StaffAvatar } from '@/components/personnel/StaffAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDutyDays, ROLE_LABELS, SHIFT_LABELS, type StaffRecord } from '@/lib/staffDirectory';

const HEAD_CLASS_NAME =
  'h-12 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]';
const CELL_CLASS_NAME = 'py-4 text-[14px] text-[#374151]';

interface StaffTableProps {
  records: StaffRecord[];
  onViewProfile: (record: StaffRecord) => void;
  onEdit: (record: StaffRecord) => void;
  onToggleActive: (record: StaffRecord) => void;
  emptyMessage: string;
}

export function StaffTable({
  records,
  onViewProfile,
  onEdit,
  onToggleActive,
  emptyMessage,
}: StaffTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-8 text-center text-sm text-[#6b7280]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#eef2f7] hover:bg-transparent">
          <TableHead className={HEAD_CLASS_NAME}>Name</TableHead>
          <TableHead className={HEAD_CLASS_NAME}>Staff ID</TableHead>
          <TableHead className={HEAD_CLASS_NAME}>Role</TableHead>
          <TableHead className={HEAD_CLASS_NAME}>Schedule</TableHead>
          <TableHead className={HEAD_CLASS_NAME}>Runs</TableHead>
          <TableHead className={`${HEAD_CLASS_NAME} text-right`}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.id} className="border-[#eef2f7] bg-white hover:bg-[#f8fafc]">
            <TableCell className="py-4">
              <button
                type="button"
                onClick={() => onViewProfile(record)}
                className="flex items-center gap-3 text-left"
              >
                <StaffAvatar
                  initials={record.initials}
                  isActive={record.isActive}
                  photoUrl={record.photoUrl}
                />
                <span className="flex min-w-0 flex-col">
                  <span
                    className={`text-[14px] font-medium ${
                      record.isActive ? 'text-[#111827]' : 'text-[#6b7280]'
                    }`}
                  >
                    {record.displayName}
                  </span>
                  {record.email !== null && (
                    <span className="truncate text-[12px] text-[#9ca3af]">{record.email}</span>
                  )}
                  {!record.isActive && (
                    <Badge className="mt-1 w-fit bg-[#f3f4f6] text-[#6b7280]">Inactive</Badge>
                  )}
                </span>
              </button>
            </TableCell>
            <TableCell className={CELL_CLASS_NAME}>{record.staffId}</TableCell>
            <TableCell className={CELL_CLASS_NAME}>{ROLE_LABELS[record.role]}</TableCell>
            <TableCell className="py-4">
              <span className="flex flex-col">
                <span className="text-[14px] text-[#374151]">{SHIFT_LABELS[record.shift]}</span>
                <span className="text-[12px] text-[#9ca3af]">
                  {formatDutyDays(record.dutyDays)}
                </span>
              </span>
            </TableCell>
            <TableCell className={CELL_CLASS_NAME}>{record.activity.runCount}</TableCell>
            <TableCell className="py-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="text-[#94a3b8]">
                    <DotsThreeIcon size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => onViewProfile(record)}>
                    <ArrowRightIcon size={15} />
                    View profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onEdit(record)}>
                    <PencilIcon size={15} />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onToggleActive(record)}>
                    {record.isActive ? (
                      <>
                        <ProhibitIcon size={15} />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <ArrowCounterClockwiseIcon size={15} />
                        Reactivate
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
