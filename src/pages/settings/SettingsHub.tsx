import { Layout } from '@/components/layout/Layout';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderTree, Tags, Wallet, LogOut, ChevronRight, Coins, RefreshCcw, Palette, PlayCircle, FileJson } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/context/OnboardingContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const settingsItems = [
  {
    label: 'Appearance',
    description: 'Theme and display settings',
    path: '/settings/theme',
    icon: Palette,
  },
  {
    label: 'Categories',
    description: 'Manage expense categories',
    path: '/settings/categories',
    icon: FolderTree,
  },
  {
    label: 'Tags',
    description: 'Create and manage tags',
    path: '/settings/tags',
    icon: Tags,
  },
  {
    label: 'Accounts',
    description: 'Bank and credit accounts',
    path: '/settings/accounts',
    icon: Wallet,
  },
  {
    label: 'Recurring Expenses',
    description: 'Subscriptions and monthly bills',
    path: '/settings/recurring',
    icon: RefreshCcw,
  },
  {
    label: 'Currency',
    description: 'Choose your currency',
    path: '/settings/currency',
    icon: Coins,
  },
  {
    label: 'Import & Export',
    description: 'Backup or transfer data',
    path: '/settings/data',
    icon: FileJson,
  },
];

export default function SettingsHub() {
  const { signOut, user } = useAuth();
  const { startTour } = useOnboarding();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* User Info Card */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl glass-card border border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-semibold text-primary-foreground">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">Account</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Settings Links */}
        <div className="space-y-2">
          {settingsItems.map((item, i) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group',
                    'glass-card border border-white/5 hover:border-white/10',
                    isActive && 'border-primary/30 bg-primary/5'
                  )
                }
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </NavLink>
            </motion.div>
          ))}
        </div>

        {/* App Tour Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="outline"
            onClick={startTour}
            className="w-full h-14 rounded-xl border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
          >
            <PlayCircle className="w-5 h-5 mr-3" />
            Watch App Tour
          </Button>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full h-14 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </motion.div>
      </div>
    </Layout>
  );
}
