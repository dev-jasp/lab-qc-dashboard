import { FileXlsIcon, SpinnerGapIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xlsm'];

interface RunFileDropzoneProps {
  onFile: (file: File) => void;
  isBusy: boolean;
  /** Parse failure from the last attempt. Kept visible until the next drop. */
  error: string | null;
  disabled?: boolean;
}

/**
 * Drop target for a bench protocol workbook, shown in place of the entry form.
 *
 * A failed parse leaves the operator here with the reason, rather than
 * returning them to a form that was never filled — the error and the retry
 * belong in the same place.
 */
export function RunFileDropzone({
  onFile,
  isBusy,
  error,
  disabled = false,
}: RunFileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isInteractive = !disabled && !isBusy;

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];

    if (file !== undefined && isInteractive) {
      onFile(file);
    }
  };

  const borderColour = isDragging
    ? 'border-[#1a1aff] bg-[#f5f5ff]'
    : error !== null
      ? 'border-[#fecaca] bg-[#fffafa]'
      : 'border-[#d7dced] bg-[#fbfcff]';

  return (
    <div className="flex h-full flex-col gap-3">
      <button
        type="button"
        disabled={!isInteractive}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();

          if (isInteractive) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`flex w-full flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 min-h-[14rem] ${borderColour}`}
      >
        {isBusy ? (
          <SpinnerGapIcon size={28} className="animate-spin text-[#1a1aff]" />
        ) : (
          <FileXlsIcon size={28} className="text-[#1a1aff]" />
        )}

        <span className="space-y-1">
          <span className="block text-[14px] font-semibold text-[#111827]">
            {isBusy ? 'Reading the workbook…' : 'Drop the run workbook here'}
          </span>
          <span className="block text-[12px] text-[#6b7280]">
            {`or click to browse · ${ACCEPTED_EXTENSIONS.join(', ')}`}
          </span>
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          // Clear the value so re-picking the same file fires change again.
          event.target.value = '';
        }}
      />

      {error !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5">
          <WarningCircleIcon
            size={16}
            weight="fill"
            className="mt-0.5 shrink-0 text-[#dc2626]"
          />
          <p className="text-[12px] leading-5 text-[#b91c1c]">{error}</p>
        </div>
      )}
    </div>
  );
}
