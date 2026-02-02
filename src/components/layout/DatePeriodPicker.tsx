import { useDateRange, DatePreset, PRESET_LABELS } from '@/context/DateRangeContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

const presetOptions: DatePreset[] = [
  'this-month',
  'last-month',
  'last-3-months',
  'last-6-months',
  'this-year',
  'last-year',
  'all-time',
];

export function DatePeriodPicker() {
  const { preset, setPreset } = useDateRange();

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground hidden sm:block" />
      <Select value={preset} onValueChange={(value) => setPreset(value as DatePreset)}>
        <SelectTrigger className="w-[140px] sm:w-[160px] h-8 text-xs sm:text-sm">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {presetOptions.map((option) => (
            <SelectItem key={option} value={option} className="text-xs sm:text-sm">
              {PRESET_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
