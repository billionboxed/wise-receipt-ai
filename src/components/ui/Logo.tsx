import { cn } from '@/lib/utils';
import logoImage from '@/assets/logo.png';

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

export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <img 
      src={logoImage}
      alt="Clear Spends"
      className={cn(sizeMap[size], className)}
    />
  );
}
