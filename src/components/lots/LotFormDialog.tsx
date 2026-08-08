import { useEffect, useState } from 'react';

import { CONTROL_DEFINITIONS, DISEASE_DEFINITIONS } from '@/constants/monitor-config';
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
import { IsoDatePicker } from '@/components/ui/IsoDatePicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createDefaultLotFormValues,
  validateLotForm,
  type LotFormValues,
} from '@/lib/lotValidation';
import type { ControlTypeSlug, DiseaseSlug } from '@/types/qc.types';

const FIELD_CLASS_NAME = 'h-11 border-[#dce4f2] bg-white px-3';
const DATE_FIELD_CLASS_NAME =
  'h-11 border-[#dce4f2] bg-white text-[#1A1C1C] hover:bg-[#F8FAFC]';

export type LotTarget = {
  disease: DiseaseSlug;
  controlType: ControlTypeSlug;
};

export interface LotFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fixed stream to act on, or null to let the user pick one in the dialog. */
  target: LotTarget | null;
  defaultStartDate: string;
  dateFormat?: 'YYYY-MM-DD';
  /** Surface the message to the user; the dialog does not toast on its own. */
  onInvalid: (message: string) => void;
  /** Resolve truthy to close the dialog and reset the form. */
  onSubmit: (values: LotFormValues, target: LotTarget) => Promise<boolean> | boolean;
}

const FALLBACK_TARGET: LotTarget = {
  disease: DISEASE_DEFINITIONS[0].slug,
  controlType: CONTROL_DEFINITIONS[0].slug,
};

function describeTarget(target: LotTarget): string {
  const diseaseName =
    DISEASE_DEFINITIONS.find((disease) => disease.slug === target.disease)?.name ?? target.disease;
  const controlLabel =
    CONTROL_DEFINITIONS.find((control) => control.slug === target.controlType)?.label ??
    target.controlType;

  return `${diseaseName} · ${controlLabel}`;
}

/**
 * The start-lot / start-batch form, shared by the control monitor and the lot
 * console. Each caller keeps its own post-submit side effects — the monitor
 * swaps the selected lot, the console refreshes the registry.
 *
 * In-house controls are batches (no expiry); positive/negative are reagent lots.
 */
export function LotFormDialog({
  open,
  onOpenChange,
  target,
  defaultStartDate,
  dateFormat = 'YYYY-MM-DD',
  onInvalid,
  onSubmit,
}: LotFormDialogProps) {
  const [values, setValues] = useState<LotFormValues>(() =>
    createDefaultLotFormValues(defaultStartDate),
  );
  const [chosenTarget, setChosenTarget] = useState<LotTarget>(target ?? FALLBACK_TARGET);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTargetFixed = target !== null;
  const activeTarget = isTargetFixed ? target : chosenTarget;
  const isBatch = activeTarget.controlType === 'in-house-control';

  // Reopening should always present a clean form, including when the caller
  // reopens it for a different control stream.
  useEffect(() => {
    if (!open) {
      return;
    }

    setValues(createDefaultLotFormValues(defaultStartDate));

    if (target !== null) {
      setChosenTarget(target);
    }
  }, [open, defaultStartDate, target]);

  const handleSubmit = async () => {
    const validationError = validateLotForm(values, isBatch ? 'batch' : 'lot');

    if (validationError !== null) {
      onInvalid(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const didSucceed = await onSubmit(
        {
          ...values,
          lotNumber: values.lotNumber.trim(),
          notes: values.notes.trim(),
        },
        activeTarget,
      );

      if (didSucceed) {
        onOpenChange(false);
        setValues(createDefaultLotFormValues(defaultStartDate));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isBatch ? 'Start new in-house batch' : 'Start new lot'}</DialogTitle>
          <DialogDescription>
            {isBatch
              ? 'The current active in-house batch will be archived and a fresh graph will become the working dataset for this control.'
              : 'The current active lot will be archived and the new lot will become the working dataset for this control.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isTargetFixed ? (
            <div className="rounded-xl border border-[#dbe3ef] bg-[#f8fafc] px-4 py-2.5 text-[13px] font-semibold text-[#374151]">
              {describeTarget(activeTarget)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1A1C1C]">Disease</label>
                <Select
                  value={chosenTarget.disease}
                  onValueChange={(value) =>
                    setChosenTarget((current) => ({ ...current, disease: value as DiseaseSlug }))
                  }
                >
                  <SelectTrigger className={FIELD_CLASS_NAME}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISEASE_DEFINITIONS.map((disease) => (
                      <SelectItem key={disease.slug} value={disease.slug}>
                        {disease.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1A1C1C]">Control</label>
                <Select
                  value={chosenTarget.controlType}
                  onValueChange={(value) =>
                    setChosenTarget((current) => ({
                      ...current,
                      controlType: value as ControlTypeSlug,
                    }))
                  }
                >
                  <SelectTrigger className={FIELD_CLASS_NAME}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTROL_DEFINITIONS.map((control) => (
                      <SelectItem key={control.slug} value={control.slug}>
                        {control.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1C1C]">
              {isBatch ? 'Batch ID' : 'Lot Number'}
            </label>
            <Input
              value={values.lotNumber}
              onChange={(event) =>
                setValues((current) => ({ ...current, lotNumber: event.target.value }))
              }
              placeholder={isBatch ? 'Enter in-house batch ID' : 'Enter reagent lot number'}
              className={FIELD_CLASS_NAME}
            />
          </div>

          <div className={isBatch ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 gap-4 lg:grid-cols-2'}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1C1C]">Start Date</label>
              <IsoDatePicker
                value={values.startDate}
                onChange={(value) => setValues((current) => ({ ...current, startDate: value }))}
                displayFormat={dateFormat}
                className={DATE_FIELD_CLASS_NAME}
              />
            </div>

            {!isBatch && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1A1C1C]">Expiry Date</label>
                <IsoDatePicker
                  value={values.expiryDate}
                  onChange={(value) => setValues((current) => ({ ...current, expiryDate: value }))}
                  displayFormat={dateFormat}
                  className={DATE_FIELD_CLASS_NAME}
                />
              </div>
            )}
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
              placeholder={
                isBatch ? 'Optional notes for this in-house batch' : 'Optional notes for this lot'
              }
              className="resize-none border-[#dce4f2] bg-white px-3 py-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
            {isBatch ? 'Start batch' : 'Start lot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
