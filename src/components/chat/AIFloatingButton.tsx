import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpenseAIChat } from './ExpenseAIChat';

export function AIFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6"
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className={`
            h-14 w-14 rounded-full shadow-lg btn-glow
            bg-gradient-to-br from-primary to-accent
            hover:from-primary/90 hover:to-accent/90
            transition-all duration-300
            ${isOpen ? 'rotate-45' : ''}
          `}
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      </motion.div>
      
      <ExpenseAIChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
