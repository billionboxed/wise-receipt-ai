import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="lg:ml-64 min-h-screen"
      >
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </motion.main>
    </div>
  );
}
