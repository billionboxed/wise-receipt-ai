import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
};

const iconSizeMap = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-7 h-7',
};

export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <div 
      className={cn(
        'rounded-full bg-foreground flex items-center justify-center',
        sizeMap[size],
        className
      )}
    >
      <Zap className={cn('text-background', iconSizeMap[size])} />
    </div>
  );
}
