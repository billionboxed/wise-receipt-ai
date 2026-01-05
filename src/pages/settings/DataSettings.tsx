import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { Download, Upload, ArrowLeft, FileJson } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExportTransactions } from '@/components/settings/ExportTransactions';
import { ImportTransactions } from '@/components/settings/ImportTransactions';
import { cn } from '@/lib/utils';

export default function DataSettings() {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <NavLink
            to="/settings"
            className="p-2 rounded-xl glass-card border border-white/5 hover:border-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </NavLink>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Import & Export
            </h1>
            <p className="text-muted-foreground mt-1">
              Backup or transfer your expense data
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'export' ? 'default' : 'outline'}
            onClick={() => setActiveTab('export')}
            className={cn(
              'flex-1 gap-2',
              activeTab === 'export' && 'bg-primary text-primary-foreground'
            )}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            variant={activeTab === 'import' ? 'default' : 'outline'}
            onClick={() => setActiveTab('import')}
            className={cn(
              'flex-1 gap-2',
              activeTab === 'import' && 'bg-primary text-primary-foreground'
            )}
          >
            <Upload className="w-4 h-4" />
            Import
          </Button>
        </div>

        {/* Format Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl glass-card border border-white/5"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">ClearSpends Format</p>
              <p className="text-sm text-muted-foreground">
                Includes categories, tags, accounts & transactions
              </p>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: activeTab === 'export' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'export' ? <ExportTransactions /> : <ImportTransactions />}
        </motion.div>
      </div>
    </Layout>
  );
}
