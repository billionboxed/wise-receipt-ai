import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: 'primary' | 'success' | 'destructive' | 'accent';
  delay?: number;
}

const iconColorClasses = {
  primary: 'from-primary/20 to-primary/5 text-primary',
  success: 'from-success/20 to-success/5 text-success',
  destructive: 'from-destructive/20 to-destructive/5 text-destructive',
  accent: 'from-accent/20 to-accent/5 text-accent',
};

const glowClasses = {
  primary: 'shadow-[0_0_30px_hsl(195_100%_50%/0.15)]',
  success: 'shadow-[0_0_30px_hsl(160_100%_45%/0.15)]',
  destructive: 'shadow-[0_0_30px_hsl(0_85%_60%/0.15)]',
  accent: 'shadow-[0_0_30px_hsl(280_100%_65%/0.15)]',
};

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'primary',
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-5 lg:p-6 transition-all duration-500 group',
        'bg-card border border-border hover:border-primary/30',
        'backdrop-blur-xl shadow-card',
        glowClasses[iconColor]
      )}
    >
      {/* Ambient glow effect */}
      <div className={cn(
        'absolute -top-16 -right-16 sm:-top-20 sm:-right-20 w-32 h-32 sm:w-40 sm:h-40 rounded-full blur-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-40',
        iconColor === 'primary' && 'bg-primary',
        iconColor === 'success' && 'bg-success',
        iconColor === 'destructive' && 'bg-destructive',
        iconColor === 'accent' && 'bg-accent'
      )} />
      
      {/* Top line glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="relative flex items-start justify-between gap-2">
        <div className="space-y-1.5 sm:space-y-3 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </p>
          <p className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground truncate">
            {value}
          </p>
          {change && (
            <p
              className={cn(
                'text-xs sm:text-sm font-medium flex items-center gap-1 line-clamp-1',
                changeType === 'positive' && 'text-success',
                changeType === 'negative' && 'text-destructive',
                changeType === 'neutral' && 'text-muted-foreground'
              )}
            >
              {changeType === 'positive' && (
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />
              )}
              {changeType === 'negative' && (
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-destructive animate-pulse flex-shrink-0" />
              )}
              <span className="truncate">{change}</span>
            </p>
          )}
        </div>
        <div
          className={cn(
            'p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-br transition-all duration-500 flex-shrink-0',
            iconColorClasses[iconColor]
          )}
        >
          <Icon className={cn(
            'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-all duration-500',
            'drop-shadow-[0_0_10px_currentColor]'
          )} />
        </div>
      </div>
    </motion.div>
  );
}
