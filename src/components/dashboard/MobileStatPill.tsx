import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileStatPillProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor?: 'primary' | 'success' | 'destructive' | 'accent';
  delay?: number;
}

const iconColorClasses = {
  primary: 'bg-primary/20 text-primary',
  success: 'bg-success/20 text-success',
  destructive: 'bg-destructive/20 text-destructive',
  accent: 'bg-accent/20 text-accent',
};

export function MobileStatPill({
  title,
  value,
  icon: Icon,
  iconColor = 'primary',
  delay = 0,
}: MobileStatPillProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        'flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl',
        'bg-gradient-to-br from-white/[0.06] to-white/[0.02]',
        'border border-white/[0.08]',
        'min-w-[140px]'
      )}
    >
      <div className={cn('p-2 rounded-xl', iconColorClasses[iconColor])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">
          {title}
        </p>
        <p className="text-base font-bold text-foreground truncate">
          {value}
        </p>
      </div>
    </motion.div>
  );
}
