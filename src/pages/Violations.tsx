import { WarningIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getAllViolations } from '@/lib/qcStorage';
import type { ViolationEntry } from '@/types/qc.types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function formatViolationDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function ViolationTable({ violations }: { violations: ViolationEntry[] }) {
  const navigate = useNavigate();

  if (violations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-8 text-center text-sm text-[#6b7280]">
        No violations found for this view.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#eef2f7] hover:bg-transparent">
          <TableHead className="h-12 text-[12px] uppercase tracking-[0.05em] text-[#94a3b8]">Timestamp</TableHead>
          <TableHead className="h-12 text-[12px] uppercase tracking-[0.05em] text-[#94a3b8]">Rule</TableHead>
          <TableHead className="h-12 text-[12px] uppercase tracking-[0.05em] text-[#94a3b8]">Severity</TableHead>
          <TableHead className="h-12 text-[12px] uppercase tracking-[0.05em] text-[#94a3b8]">Protocols</TableHead>
          <TableHead className="h-12 text-right text-[12px] uppercase tracking-[0.05em] text-[#94a3b8]">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {violations.map((violation) => (
          <TableRow key={violation.id} className="border-[#eef2f7] bg-white hover:bg-[#f8fafc]">
            <TableCell className="py-4 text-sm text-[#111827]">{formatViolationDate(violation.timestamp)}</TableCell>
            <TableCell className="py-4 text-sm font-medium text-[#111827]">{violation.ruleName.replace('_', '-')}</TableCell>
            <TableCell className="py-4">
              <Badge className={violation.severity === 'rejection' ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#fef3c7] text-[#d97706]'}>
                {violation.severity === 'rejection' ? 'Rejection' : 'Warning'}
              </Badge>
            </TableCell>
            <TableCell className="py-4 text-sm text-[#374151]">{violation.triggeringProtocols.join(', ')}</TableCell>
            <TableCell className="py-4 text-right">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate('/history')}>
                Review history
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function Violations() {
  const [violations, setViolations] = useState<ViolationEntry[]>([]);

  useEffect(() => {
    let isCancelled = false;

    const loadViolations = async () => {
      const allViolations = await getAllViolations();

      if (!isCancelled) {
        setViolations(allViolations);
      }
    };

    void loadViolations();

    const handleViolationRefresh = () => {
      void loadViolations();
    };

    window.addEventListener('qc-violations-changed', handleViolationRefresh);

    return () => {
      isCancelled = true;
      window.removeEventListener('qc-violations-changed', handleViolationRefresh);
    };
  }, []);

  const openViolations = useMemo(() => violations.filter((violation) => !violation.acknowledged), [violations]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-8 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">Violation Inbox</p>
            <h1 className="mt-3 text-3xl font-bold text-[#111827]">Review QC rule escalations</h1>
            <p className="mt-3 max-w-3xl text-sm text-[#6b7280]">
              Open rejection and warning events across all diseases and controls are collected here for supervisor review.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#fee2e2] px-4 py-2 text-sm font-semibold text-[#dc2626]">
            <WarningIcon size={16} />
            {`${openViolations.length} open items`}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <Tabs defaultValue="open" className="space-y-5">
          <TabsList className="bg-[#f3f4f6]">
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <TabsContent value="open">
            <ViolationTable violations={openViolations} />
          </TabsContent>
          <TabsContent value="all">
            <ViolationTable violations={violations} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
