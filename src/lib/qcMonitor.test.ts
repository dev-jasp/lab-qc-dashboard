import { describe, expect, it } from 'vitest';

import { CONTROL_DEFINITIONS, DISEASE_DEFINITIONS } from '@/constants/monitor-config';
import { buildSeedEntries, buildSeedViolations } from '@/lib/qcMonitor';
import type { ViolationEntry } from '@/types/qc.types';

const seededStreams = DISEASE_DEFINITIONS.flatMap((disease) =>
  CONTROL_DEFINITIONS.map((control) => {
    const entries = buildSeedEntries(disease.slug, control.slug);

    return {
      label: `${disease.slug}/${control.slug}`,
      entries,
      violations: buildSeedViolations(disease.slug, control.slug, entries),
    };
  }),
);

const allViolations: ViolationEntry[] = seededStreams.flatMap((stream) => stream.violations);

describe('seeded violations', () => {
  it.each(seededStreams)('$label cites protocols that exist in its own runs', ({ entries, violations }) => {
    const knownProtocols = new Set(entries.map((entry) => entry.protocolNumber));

    for (const violation of violations) {
      expect(violation.triggeringProtocols.length).toBeGreaterThan(0);

      for (const protocolNumber of violation.triggeringProtocols) {
        expect(knownProtocols).toContain(protocolNumber);
      }
    }
  });

  it.each(seededStreams)('$label pairs every OD value with a protocol', ({ violations }) => {
    for (const violation of violations) {
      expect(violation.triggeringODValues).toHaveLength(violation.triggeringProtocols.length);
    }
  });

  it('leaves at least one open rejection so the violation badge is never empty', () => {
    const openRejections = allViolations.filter(
      (violation) => !violation.acknowledged && violation.severity === 'rejection',
    );

    expect(openRejections.length).toBeGreaterThan(0);
  });

  it('leaves some violations open and resolves the rest', () => {
    const open = allViolations.filter((violation) => !violation.acknowledged);

    expect(open.length).toBeGreaterThan(0);
    expect(open.length).toBeLessThan(allViolations.length);
  });

  it('spreads corrective actions across root causes so the Pareto has a shape', () => {
    const rootCauses = new Set(
      allViolations
        .map((violation) => violation.correctiveAction?.rootCause)
        .filter((rootCause): rootCause is NonNullable<typeof rootCause> => rootCause !== undefined),
    );

    // A Pareto over one or two causes is a bar chart, not an analysis.
    expect(rootCauses.size).toBeGreaterThanOrEqual(5);
  });

  it('keeps acknowledgement fields internally consistent', () => {
    for (const violation of allViolations) {
      if (violation.acknowledged) {
        expect(violation.correctiveAction).not.toBeNull();
        expect(violation.acknowledgedBy).not.toBeNull();
        expect(violation.acknowledgedAt).not.toBeNull();
      } else {
        expect(violation.correctiveAction).toBeNull();
        expect(violation.acknowledgedBy).toBeNull();
        expect(violation.acknowledgedAt).toBeNull();
      }
    }
  });
});
