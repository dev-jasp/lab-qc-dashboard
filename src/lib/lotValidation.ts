export type LotFormKind = 'lot' | 'batch';

export type LotFormValues = {
  lotNumber: string;
  startDate: string;
  expiryDate: string;
  notes: string;
};

export function createDefaultLotFormValues(startDate: string): LotFormValues {
  return {
    lotNumber: '',
    startDate,
    expiryDate: '',
    notes: '',
  };
}

/**
 * Shared validation for the start-lot / start-batch form.
 *
 * Lives here rather than in either caller so the monitor page and the lot
 * console cannot drift apart on what a valid lot looks like.
 *
 * @returns An error message to surface, or null when the form is valid.
 */
export function validateLotForm(values: LotFormValues, kind: LotFormKind): string | null {
  if (!values.lotNumber.trim()) {
    return kind === 'batch' ? 'In-house batch ID is required.' : 'Lot number is required.';
  }

  if (kind === 'batch') {
    return null;
  }

  if (!values.expiryDate) {
    return 'Expiry date is required for reagent lots.';
  }

  // ISO date strings compare correctly as plain strings.
  if (values.expiryDate < values.startDate) {
    return 'Expiry date cannot be earlier than the start date.';
  }

  return null;
}
