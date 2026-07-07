import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

export function AIFloatingButton() {
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname === '/ai-chat') return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
      className="fixed bottom-24 right-4 z-40 lg:bottom-6 lg:right-6"
    >
      <Button
        onClick={() => navigate('/ai-chat')}
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg btn-glow bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300"
      >
        <Sparkles className="w-6 h-6" />
      </Button>
    </motion.div>
  );
}
