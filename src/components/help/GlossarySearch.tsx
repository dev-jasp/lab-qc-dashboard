import { MagnifyingGlassIcon } from '@phosphor-icons/react';

import { Input } from '@/components/ui/input';

interface GlossarySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function GlossarySearch({ value, onChange }: GlossarySearchProps) {
  return (
    <div className="w-full">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
        <Input
          id="glossary-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search OD, CV, lot number, 1_2s..."
          className="h-11 rounded-xl border-[#dbe3ef] bg-white pl-10 pr-4 text-sm text-[#111827] placeholder:text-[#9ca3af]"
        />
      </div>
    </div>
  );
}
