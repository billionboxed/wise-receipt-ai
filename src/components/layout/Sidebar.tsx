import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  Upload,
  Settings,
  Tags,
  Wallet,
  FolderTree,
  Menu,
  X,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Transactions', path: '/transactions', icon: Receipt },
  { label: 'Upload', path: '/upload', icon: Upload },
  { label: 'Analytics', path: '/analytics', icon: TrendingUp },
];

const settingsNavItems: NavItem[] = [
  { label: 'Categories', path: '/settings/categories', icon: FolderTree },
  { label: 'Tags', path: '/settings/tags', icon: Tags },
  { label: 'Accounts', path: '/settings/accounts', icon: Wallet },
];

export function Sidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/5">
        <div className="relative">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center shadow-neon">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent opacity-50 blur-xl" />
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <span className="font-bold text-lg bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              ExpenseAI
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary/80">
              Smart Finance
            </span>
          </motion.div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-thin">
        <div className="mb-4">
          {!isCollapsed && (
            <span className="px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em]">
              Menu
            </span>
          )}
        </div>
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group',
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-xl shadow-neon"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className={cn(
                  'w-5 h-5 flex-shrink-0 relative z-10 transition-all duration-300',
                  isActive && 'drop-shadow-[0_0_8px_hsl(var(--primary))]'
                )} />
                {!isCollapsed && (
                  <span className="font-medium text-sm relative z-10">{item.label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="pt-8 mb-4">
          {!isCollapsed && (
            <span className="px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em]">
              Settings
            </span>
          )}
        </div>
        {settingsNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group',
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNavSettings"
                    className="absolute inset-0 bg-gradient-to-r from-accent to-accent/80 rounded-xl shadow-neon-accent"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className={cn(
                  'w-5 h-5 flex-shrink-0 relative z-10 transition-all duration-300',
                  isActive && 'drop-shadow-[0_0_8px_hsl(var(--accent))]'
                )} />
                {!isCollapsed && (
                  <span className="font-medium text-sm relative z-10">{item.label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Button - Desktop only */}
      <div className="hidden lg:flex items-center justify-center p-4 border-t border-white/5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-xl glass-card border-white/10"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-40"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 w-72 z-50 border-r border-white/5"
            style={{ background: 'linear-gradient(180deg, hsl(220, 20%, 6%) 0%, hsl(220, 25%, 4%) 100%)' }}
          >
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="hidden lg:block fixed left-0 top-0 bottom-0 z-30 border-r border-white/5"
        style={{ background: 'linear-gradient(180deg, hsl(220, 20%, 6%) 0%, hsl(220, 25%, 4%) 100%)' }}
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
}
