import { ArrowRightIcon, SlidersHorizontalIcon, StackIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/useToast";
import { getSettings, updateSettings } from "@/lib/qcStorage";

const MIN_WARNING_DAYS = 1;
const MAX_WARNING_DAYS = 365;

export function Settings() {
  const [warningDays, setWarningDays] = useState("30");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    let isCancelled = false;

    const loadSettings = async () => {
      try {
        const settings = await getSettings();

        if (!isCancelled) {
          setWarningDays(String(settings.lotExpiryWarningDays));
        }
      } catch (caughtError) {
        if (!isCancelled) {
          error(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load QC settings.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isCancelled = true;
    };
  }, [error]);

  const handleSave = async () => {
    const parsedDays = Number(warningDays);

    if (!Number.isInteger(parsedDays) || parsedDays < MIN_WARNING_DAYS || parsedDays > MAX_WARNING_DAYS) {
      error(`Expiry warning must be a whole number between ${MIN_WARNING_DAYS} and ${MAX_WARNING_DAYS} days.`);
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({ lotExpiryWarningDays: parsedDays });
      success(`Lots will be flagged ${parsedDays} days before expiry.`);
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
