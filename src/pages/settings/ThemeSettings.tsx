import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Sun, Moon, Circle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      id: 'light',
      name: 'Light',
      description: 'Clean and bright interface',
      icon: Sun,
      preview: {
        bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
        card: 'bg-white',
        accent: 'bg-cyan-500',
      },
    },
    {
      id: 'dark',
      name: 'Dark',
      description: 'Easy on the eyes at night',
      icon: Moon,
      preview: {
        bg: 'bg-gradient-to-br from-slate-900 to-slate-950',
        card: 'bg-slate-800/50',
        accent: 'bg-cyan-400',
      },
    },
    {
      id: 'mono',
      name: 'Monochrome',
      description: 'Elegant black & white',
      icon: Circle,
      preview: {
        bg: 'bg-gradient-to-br from-neutral-950 to-black',
        card: 'bg-neutral-900/60',
        accent: 'bg-white',
      },
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Appearance
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize how the app looks and feels
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {themes.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setTheme(t.id)}
              className={cn(
                'relative p-4 rounded-xl text-left transition-all duration-300 group',
                'border-2',
                theme === t.id
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/30 bg-card'
              )}
            >
              {/* Selected indicator */}
              {theme === t.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-primary-foreground" />
                </motion.div>
              )}

              {/* Preview mockup */}
              <div className={cn(
                'w-full h-24 rounded-lg mb-4 overflow-hidden',
                t.preview.bg
              )}>
                <div className="p-2 h-full flex flex-col gap-1.5">
                  {/* Mock header */}
                  <div className="h-2 w-1/3 rounded-full bg-white/20" />
                  {/* Mock cards */}
                  <div className="flex-1 flex gap-1.5">
                    <div className={cn('flex-1 rounded', t.preview.card)} />
                    <div className={cn('flex-1 rounded', t.preview.card)} />
                  </div>
                  {/* Mock accent */}
                  <div className={cn('h-1.5 w-2/3 rounded-full', t.preview.accent)} />
                </div>
              </div>

              {/* Theme info */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  theme === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  <t.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Preview section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl glass-card border border-border"
        >
          <h3 className="font-medium text-foreground mb-3">Preview</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <div className="text-sm text-primary font-medium">Primary</div>
            </div>
            <div className="p-3 rounded-lg bg-success/10 text-center">
              <div className="text-sm text-success font-medium">Income</div>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 text-center">
              <div className="text-sm text-destructive font-medium">Expense</div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
