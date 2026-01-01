import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { AIFloatingButton } from '@/components/chat/AIFloatingButton';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Mobile Bottom Navigation */}
      <BottomNav />
      
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="lg:ml-64 min-h-screen"
      >
        {/* Added bottom padding for mobile bottom nav, safe area support */}
        <div className="p-4 lg:p-8 pt-6 lg:pt-8 pb-24 lg:pb-8">
          {children}
        </div>
      </motion.main>

      {/* AI Chat Button */}
      <AIFloatingButton />
    </div>
  );
}
