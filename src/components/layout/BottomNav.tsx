import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  Upload,
  TrendingUp,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExpenseAIChat } from '@/components/chat/ExpenseAIChat';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Transactions', path: '/transactions', icon: Receipt },
  { label: 'Upload', path: '/upload', icon: Upload },
  { label: 'Analytics', path: '/analytics', icon: TrendingUp },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function BottomNav() {
  const location = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Check if current path is any settings page
  const isSettingsActive = location.pathname.startsWith('/settings');

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border pb-safe">
        <div className="flex items-center justify-around h-14">
          {navItems.slice(0, 2).map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:scale-90'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBottomNav"
                    className="absolute inset-1 bg-primary/10 rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <item.icon className="w-5 h-5 relative z-10" />
              </NavLink>
            );
          })}

          {/* AI Chat Button in Center */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={cn(
              'relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200',
              isChatOpen
                ? 'text-primary'
                : 'text-muted-foreground active:scale-90'
            )}
          >
            {isChatOpen && (
              <motion.div
                layoutId="activeBottomNav"
                className="absolute inset-1 bg-primary/10 rounded-full"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <Sparkles className="w-5 h-5 relative z-10" />
          </button>

          {navItems.slice(2).map((item) => {
            const isActive = item.path === '/settings' 
              ? isSettingsActive 
              : location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:scale-90'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBottomNav"
                    className="absolute inset-1 bg-primary/10 rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <item.icon className="w-5 h-5 relative z-10" />
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* AI Chat Panel */}
      <ExpenseAIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}
