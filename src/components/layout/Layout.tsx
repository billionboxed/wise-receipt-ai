import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { AIFloatingButton } from '@/components/chat/AIFloatingButton';
import { AnalyticsFilter } from './AnalyticsFilter';
import { DatePeriodPicker } from './DatePeriodPicker';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: ReactNode;
  hideAIButton?: boolean;
}

export function Layout({ children, hideAIButton = false }: LayoutProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const showAnalyticsFilter = pathname === '/dashboard' || pathname === '/analytics';

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Mobile Bottom Navigation (includes AI chat) */}
      {!hideAIButton && <BottomNav />}
      
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="lg:ml-64 min-h-screen"
      >
        {/* Added bottom padding for mobile bottom nav, safe area support */}
        <div className={`p-3 sm:p-4 lg:p-8 pt-4 sm:pt-6 lg:pt-8 ${hideAIButton ? 'pb-8' : 'pb-24'} lg:pb-8`}>
          {/* Analytics Filter - shown only on Dashboard and Analytics */}
          {showAnalyticsFilter && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <DatePeriodPicker />
              <AnalyticsFilter />
            </div>
          )}
          {children}
        </div>
      </motion.main>

      {/* AI Chat Button - Desktop only */}
      {!hideAIButton && (
        <div className="hidden lg:block">
          <AIFloatingButton />
        </div>
      )}
    </div>
  );
}
