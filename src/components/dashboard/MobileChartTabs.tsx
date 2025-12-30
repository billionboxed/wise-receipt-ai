import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart as PieChartIcon, TrendingUp, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryChart } from './CategoryChart';
import { SpendingTrend } from './SpendingTrend';
import { TagsSpending } from './TagsSpending';

type TabType = 'category' | 'trend' | 'tags';

const tabs: { id: TabType; label: string; icon: typeof PieChartIcon }[] = [
  { id: 'category', label: 'Category', icon: PieChartIcon },
  { id: 'trend', label: 'Trend', icon: TrendingUp },
  { id: 'tags', label: 'Tags', icon: Tag },
];

export function MobileChartTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('category');

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex gap-2 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-300',
              activeTab === tab.id
                ? 'bg-primary/20 text-primary shadow-[0_0_20px_hsl(195_100%_50%/0.2)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'category' && <CategoryChart />}
          {activeTab === 'trend' && <SpendingTrend />}
          {activeTab === 'tags' && <TagsSpending />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
