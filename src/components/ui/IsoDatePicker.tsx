import { format, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/utils/cn';

interface IsoDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function IsoDatePicker({ value, onChange, disabled = false, className }: IsoDatePickerProps) {
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
          <span>{selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Select date'}</span>
          <CalendarDays size={16} />
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
