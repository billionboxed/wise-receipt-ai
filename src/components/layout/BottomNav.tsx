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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div 
          className="mx-2 mb-2 rounded-2xl border border-border backdrop-blur-xl bg-card shadow-lg"
        >
          <div className="flex items-center justify-around px-1 py-2">
            {navItems.slice(0, 2).map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl min-w-[52px] min-h-[52px] transition-all duration-300',
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground active:scale-95'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeBottomNav"
                      className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-xl"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      style={{
                        boxShadow: '0 0 20px hsl(195 100% 50% / 0.4)'
                      }}
                    />
                  )}
                  <item.icon className={cn(
                    'w-5 h-5 relative z-10 transition-all duration-300',
                    isActive && 'drop-shadow-[0_0_8px_hsl(var(--primary))]'
                  )} />
                  <span className={cn(
                    'text-[10px] font-medium relative z-10 transition-all duration-300',
                    isActive ? 'opacity-100' : 'opacity-70'
                  )}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}

            {/* AI Chat Button in Center */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl min-w-[52px] min-h-[52px] transition-all duration-300',
                isChatOpen
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground active:scale-95'
              )}
            >
              {isChatOpen && (
                <motion.div
                  layoutId="activeBottomNav"
                  className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  style={{
                    boxShadow: '0 0 20px hsl(195 100% 50% / 0.4)'
                  }}
                />
              )}
              <div className={cn(
                'relative z-10 w-5 h-5 flex items-center justify-center',
                !isChatOpen && 'text-primary'
              )}>
                <Sparkles className={cn(
                  'w-5 h-5 transition-all duration-300',
                  isChatOpen && 'drop-shadow-[0_0_8px_hsl(var(--primary))]'
                )} />
              </div>
              <span className={cn(
                'text-[10px] font-medium relative z-10 transition-all duration-300',
                isChatOpen ? 'opacity-100' : 'opacity-70'
              )}>
                AI
              </span>
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
                    'relative flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl min-w-[52px] min-h-[52px] transition-all duration-300',
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground active:scale-95'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeBottomNav"
                      className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-xl"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      style={{
                        boxShadow: '0 0 20px hsl(195 100% 50% / 0.4)'
                      }}
                    />
                  )}
                  <item.icon className={cn(
                    'w-5 h-5 relative z-10 transition-all duration-300',
                    isActive && 'drop-shadow-[0_0_8px_hsl(var(--primary))]'
                  )} />
                  <span className={cn(
                    'text-[10px] font-medium relative z-10 transition-all duration-300',
                    isActive ? 'opacity-100' : 'opacity-70'
                  )}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* AI Chat Panel */}
      <ExpenseAIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}
