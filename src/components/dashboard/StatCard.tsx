import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-primary',
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-xl bg-card p-6 shadow-card border border-border/50 hover:shadow-lg transition-shadow duration-300"
    >
      <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-5">
        <Icon className="w-full h-full" />
      </div>
      
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold tracking-tight">{value}</p>
          {change && (
            <p
              className={cn(
                'text-sm font-medium flex items-center gap-1',
                changeType === 'positive' && 'text-success',
                changeType === 'negative' && 'text-destructive',
                changeType === 'neutral' && 'text-muted-foreground'
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div
          className={cn(
            'p-3 rounded-xl bg-gradient-to-br',
            iconColor === 'text-primary' && 'from-primary/10 to-primary/5',
            iconColor === 'text-success' && 'from-success/10 to-success/5',
            iconColor === 'text-destructive' && 'from-destructive/10 to-destructive/5',
            iconColor === 'text-accent' && 'from-accent/10 to-accent/5'
          )}
        >
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>
      </div>
    </motion.div>
  );
}
