import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  Upload,
  Tags,
  Wallet,
  FolderTree,
  Menu,
  TrendingUp,
  Sparkles,
  LogOut,
  RefreshCcw,
  Palette,
  Coins,
  FileJson,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

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
  { label: 'Recurring', path: '/settings/recurring', icon: RefreshCcw },
  { label: 'Currency', path: '/settings/currency', icon: Coins },
  { label: 'Appearance', path: '/settings/theme', icon: Palette },
  { label: 'Import/Export', path: '/settings/data', icon: FileJson },
];

export function Sidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { signOut, user } = useAuth();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-border">
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
            <span className="font-bold text-lg text-foreground">
              ExpenseAI
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary">
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
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group',
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
            
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group',
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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

      {/* User & Logout Section */}
      <div className="mt-auto p-4 border-t border-border">
        {user && (
          <div className={cn(
            "flex items-center gap-3 mb-3",
            isCollapsed && "justify-center"
          )}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold text-primary-foreground">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className={cn(
              "text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors",
              isCollapsed ? "w-full justify-center" : "flex-1"
            )}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Only - Mobile uses BottomNav */}
      <motion.aside
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="hidden lg:block fixed left-0 top-0 bottom-0 z-30 border-r border-border bg-sidebar"
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
}
