import { format, parseISO } from 'date-fns';
import { CalendarIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/utils/cn';

interface IsoDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  displayFormat?: 'YYYY-MM-DD';
}

function resolveDisplayLabel(value: string, displayFormat: 'YYYY-MM-DD') {
  if (displayFormat === 'YYYY-MM-DD') {
    return format(parseISO(value), 'yyyy-MM-dd');
  }

  return format(parseISO(value), 'MMM dd, yyyy');
}

export function IsoDatePicker({
  value,
  onChange,
  disabled = false,
  className,
  displayFormat = 'YYYY-MM-DD',
}: IsoDatePickerProps) {
  const selectedDate = value ? parseISO(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-between font-semibold',
            className,
          )}
        >
          <span>{selectedDate ? resolveDisplayLabel(value, displayFormat) : 'Select date'}</span>
          <CalendarIcon size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, 'yyyy-MM-dd'));
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
