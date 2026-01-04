import { useAnalyticsFilter, AnalyticsFilterType } from '@/context/AnalyticsFilterContext';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Folder, Layers, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';

const filterOptions: { value: AnalyticsFilterType; label: string; icon: typeof Layers }[] = [
  { value: 'regular', label: 'Regular', icon: Layers },
  { value: 'all', label: 'All', icon: FolderKanban },
  { value: 'projects', label: 'Projects', icon: Folder },
];

export function AnalyticsFilter() {
  const { filter, setFilter } = useAnalyticsFilter();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden sm:inline">View:</span>
      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(value) => value && setFilter(value as AnalyticsFilterType)}
        className="bg-muted/50 rounded-lg p-0.5"
      >
        {filterOptions.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={option.label}
            className={cn(
              'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
              'px-2 sm:px-3 py-1 h-7 text-xs gap-1'
            )}
          >
            <option.icon className="w-3 h-3" />
            <span>{option.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
