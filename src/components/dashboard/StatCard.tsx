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
        'relative overflow-hidden rounded-2xl p-6 transition-all duration-500 group',
        'bg-gradient-to-br from-white/[0.04] to-white/[0.01]',
        'border border-white/[0.06] hover:border-white/[0.12]',
        'backdrop-blur-xl',
        glowClasses[iconColor]
      )}
    >
      {/* Ambient glow effect */}
      <div className={cn(
        'absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-40',
        iconColor === 'primary' && 'bg-primary',
        iconColor === 'success' && 'bg-success',
        iconColor === 'destructive' && 'bg-destructive',
        iconColor === 'accent' && 'bg-accent'
      )} />
      
      {/* Top line glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground/80 uppercase tracking-wide">
            {title}
          </p>
          <p className="text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
            {value}
          </p>
          {change && (
            <p
              className={cn(
                'text-sm font-medium flex items-center gap-1.5',
                changeType === 'positive' && 'text-success',
                changeType === 'negative' && 'text-destructive',
                changeType === 'neutral' && 'text-muted-foreground'
              )}
            >
              {changeType === 'positive' && (
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              )}
              {changeType === 'negative' && (
                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              )}
              {change}
            </p>
          )}
        </div>
        <div
          className={cn(
            'p-4 rounded-2xl bg-gradient-to-br transition-all duration-500',
            iconColorClasses[iconColor]
          )}
        >
          <Icon className={cn(
            'w-6 h-6 transition-all duration-500',
            'drop-shadow-[0_0_10px_currentColor]'
          )} />
        </div>
      </div>
    </motion.div>
  );
}
