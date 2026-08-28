import {
  ArrowRightIcon,
  ChartLineUpIcon,
  SlidersHorizontalIcon,
  StackIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import {
  useGetSettingsQuery,
  useGetStaffQuery,
  useUpdateSettingsMutation,
} from "@/store/api/settingsEndpoints";
import type { StaffMember } from "@/types/qc.types";

const EMPTY_STAFF: StaffMember[] = [];

const MIN_WARNING_DAYS = 1;
const MIN_CUSUM_LIMIT = 2;
const MAX_CUSUM_LIMIT = 10;
const MAX_WARNING_DAYS = 365;
/** Select cannot hold an empty string value, so "nobody" needs a sentinel. */
const NO_DEFAULT_STAFF = "__none__";

export function Settings() {
  const { data: settings, isLoading: isLoadingSettings } = useGetSettingsQuery();
  const { data: staff = EMPTY_STAFF, isLoading: isLoadingStaff } = useGetStaffQuery();
  const [updateSettingsMutation] = useUpdateSettingsMutation();

  // The form is a draft of the stored settings, so it stays local state. It is
  // seeded once the query resolves rather than on every render, otherwise typing
  // would be overwritten by the value already in the cache.
  const [warningDays, setWarningDays] = useState("30");
  const [cusumLimit, setCusumLimit] = useState("5");
  const [defaultStaffId, setDefaultStaffId] = useState(NO_DEFAULT_STAFF);
  const [defaultValidatorId, setDefaultValidatorId] = useState(NO_DEFAULT_STAFF);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToast();
  const isLoading = isLoadingSettings || isLoadingStaff;

  useEffect(() => {
    if (settings === undefined) {
      return;
    }

    setWarningDays(String(settings.lotExpiryWarningDays));
    setCusumLimit(String(settings.cusumLimitMultiplier));
    setDefaultStaffId(
      staff.some((member) => member.id === settings.defaultPreparedBy)
        ? settings.defaultPreparedBy
        : NO_DEFAULT_STAFF,
    );
    setDefaultValidatorId(
      staff.some((member) => member.id === settings.defaultValidatedBy)
        ? settings.defaultValidatedBy
        : NO_DEFAULT_STAFF,
    );
  }, [settings, staff]);

  const handleSave = async () => {
    const parsedDays = Number(warningDays);

    if (!Number.isInteger(parsedDays) || parsedDays < MIN_WARNING_DAYS || parsedDays > MAX_WARNING_DAYS) {
      error(`Expiry warning must be a whole number between ${MIN_WARNING_DAYS} and ${MAX_WARNING_DAYS} days.`);
      return;
    }

    const parsedCusumLimit = Number(cusumLimit);

    if (
      !Number.isFinite(parsedCusumLimit) ||
      parsedCusumLimit < MIN_CUSUM_LIMIT ||
      parsedCusumLimit > MAX_CUSUM_LIMIT
    ) {
      error(
        `CUSUM limit must be between ${MIN_CUSUM_LIMIT} and ${MAX_CUSUM_LIMIT} standard deviations.`,
      );
      return;
    }

    if (
      defaultStaffId !== NO_DEFAULT_STAFF &&
      defaultStaffId === defaultValidatorId
    ) {
      error("The default validator must be someone other than the default technician.");
      return;
    }

    setIsSaving(true);
    try {
      await updateSettingsMutation({
        lotExpiryWarningDays: parsedDays,
        cusumLimitMultiplier: parsedCusumLimit,
        defaultPreparedBy: defaultStaffId === NO_DEFAULT_STAFF ? "" : defaultStaffId,
        defaultValidatedBy:
          defaultValidatorId === NO_DEFAULT_STAFF ? "" : defaultValidatorId,
      }).unwrap();
      success("Lab configuration saved.");
    } catch (caughtError) {
      error(
        caughtError instanceof Error ? caughtError.message : "Unable to save QC settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
          Settings
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#111827]">Lab configuration</h1>
        <p className="mt-3 max-w-3xl text-sm text-[#6b7280]">
          Lab-level defaults that apply across every disease and control stream.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-2 text-[#1a1aff]">
            <SlidersHorizontalIcon size={18} />
            <span className="text-[16px] font-semibold">Lot expiry warning</span>
          </div>
          <p className="text-sm leading-7 text-[#6b7280]">
            How many days before a reagent lot&apos;s expiry date it starts appearing on the lot
            watchlist. In-house batches have no expiry and are never flagged.
          </p>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                Days before expiry
              </label>
              <Input
                type="number"
                min={MIN_WARNING_DAYS}
                max={MAX_WARNING_DAYS}
                value={warningDays}
                disabled={isLoading}
                onChange={(event) => setWarningDays(event.target.value)}
                className="h-11 w-32 border-[#e5e7eb] bg-white px-3 text-[#111827]"
              />
            </div>
          </div>

          <div className="mt-6 border-t border-[#f0f0f0] pt-6">
            <div className="mb-3 flex items-center gap-2 text-[#1a1aff]">
              <ChartLineUpIcon size={18} />
              <span className="text-[16px] font-semibold">CUSUM decision interval</span>
            </div>
            <p className="text-sm leading-7 text-[#6b7280]">
              How far the cumulative deviation may run, in multiples of the stream&apos;s
              SD, before a drift is called a systematic shift. Lower detects drift
              sooner and raises more false alarms. The clinical default is 5.
            </p>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  Limit (× SD)
                </label>
                <Input
                  type="number"
                  min={MIN_CUSUM_LIMIT}
                  max={MAX_CUSUM_LIMIT}
                  step={0.5}
                  value={cusumLimit}
                  disabled={isLoading}
                  onChange={(event) => setCusumLimit(event.target.value)}
                  className="h-11 w-32 border-[#e5e7eb] bg-white px-3 text-[#111827]"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-[#f0f0f0] pt-6">
            <div className="mb-3 flex items-center gap-2 text-[#1a1aff]">
              <UsersIcon size={18} />
              <span className="text-[16px] font-semibold">Entry form defaults</span>
            </div>
            <p className="text-sm leading-7 text-[#6b7280]">
              Pre-fills &quot;Performed By&quot; and &quot;Validated By&quot; on the QC entry
              form, so they do not have to be picked again after every run.
            </p>

            <div className="mt-4 space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                Pre-select on the entry form
              </label>
              <Select
                value={defaultStaffId}
                disabled={isLoading}
                onValueChange={setDefaultStaffId}
              >
                <SelectTrigger className="h-11 w-full border-[#e5e7eb] bg-white px-3 text-[#111827] sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEFAULT_STAFF}>No default</SelectItem>
                  {staff
                    .filter((member) => member.isActive)
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.displayName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {staff.length === 0 && (
                <p className="text-[12px] text-[#9ca3af]">
                  Nobody on the roster yet — add someone under Personnel first.
                </p>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                Default validator
              </label>
              <Select
                value={defaultValidatorId}
                disabled={isLoading}
                onValueChange={setDefaultValidatorId}
              >
                <SelectTrigger className="h-11 w-full border-[#e5e7eb] bg-white px-3 text-[#111827] sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEFAULT_STAFF}>No default</SelectItem>
                  {staff
                    // The entry form refuses a validator who is also the
                    // performer, so a default pair that collides is not
                    // offerable here either.
                    .filter(
                      (member) => member.isActive && member.id !== defaultStaffId,
                    )
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.displayName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[12px] text-[#9ca3af]">
                Pre-fills &quot;Validated By&quot;. Must be someone other than the
                technician above — nobody attests their own run.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Button
              type="button"
              disabled={isLoading || isSaving}
              onClick={handleSave}
              className="h-11 rounded-lg bg-[#1a1aff] text-sm font-semibold text-white hover:bg-[#1515cc]"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-2 text-[#1a1aff]">
            <StackIcon size={18} />
            <span className="text-[16px] font-semibold">Lot management</span>
          </div>
          <p className="text-sm leading-7 text-[#6b7280]">
            Reagent lots and in-house batches are managed on their own page — start a lot, archive
            one, and review expiry and changeover shift across every control stream.
          </p>
          <Link
            to="/lots"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1a1aff]"
          >
            Open Batches / Lots
            <ArrowRightIcon size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
