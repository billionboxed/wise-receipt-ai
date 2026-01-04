import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/context/OnboardingContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  Receipt, 
  Upload, 
  BarChart3,
  Sparkles,
  Settings,
  FolderTree,
  Tags
} from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route?: string;
  highlight?: string;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Expense Tracker!',
    description: 'This quick tour will show you all the key features. Your expenses, beautifully organized and always under control.',
    icon: LayoutDashboard,
    route: '/',
  },
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    description: 'Your financial command center. See spending trends, category breakdowns, and recent transactions at a glance. Use the Regular/All/Projects filter to segment your view.',
    icon: LayoutDashboard,
    route: '/',
  },
  {
    id: 'transactions',
    title: 'Manage Transactions',
    description: 'View all your transactions in one place. Swipe left to delete, swipe right to edit. Long-press to enter bulk selection mode for multiple operations.',
    icon: Receipt,
    route: '/transactions',
  },
  {
    id: 'upload',
    title: 'Import Statements',
    description: 'Upload bank statements (PDF, CSV, Excel) and the AI will automatically extract and categorize your transactions. Review before confirming.',
    icon: Upload,
    route: '/upload',
  },
  {
    id: 'analytics',
    title: 'Analytics & Insights',
    description: 'Deep dive into your spending patterns. View spending by day of week, year-over-year comparisons, and forecasts based on your history.',
    icon: BarChart3,
    route: '/analytics',
  },
  {
    id: 'ai-chat',
    title: 'AI Assistant',
    description: 'Chat with AI to add expenses naturally ("I spent ₹500 on groceries") or ask questions about your spending. Available via the floating button or dedicated page.',
    icon: Sparkles,
    route: '/ai-chat',
  },
  {
    id: 'categories-tags',
    title: 'Categories & Tags',
    description: 'Organize expenses with hierarchical categories (Main > Sub) and flexible tags. Mark tags as "Project" to track one-off expenses separately from regular spending.',
    icon: FolderTree,
    route: '/settings/categories',
  },
  {
    id: 'settings',
    title: 'Customize Your Experience',
    description: 'Configure accounts, recurring expenses, currency, and appearance. You can always replay this tour from Settings anytime!',
    icon: Settings,
    route: '/settings',
  },
];

export function OnboardingTour() {
  const { isTourActive, currentStep, totalSteps, nextStep, prevStep, endTour } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  const step = tourSteps[currentStep];

  // Navigate to the step's route when step changes
  useEffect(() => {
    if (isTourActive && step?.route && location.pathname !== step.route) {
      setIsNavigating(true);
      navigate(step.route);
      const timer = setTimeout(() => setIsNavigating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isTourActive, currentStep, step?.route, location.pathname, navigate]);

  if (!isTourActive || !step) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const Icon = step.icon;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={endTour}
      />

      {/* Tour Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-4 bottom-24 lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:inset-auto lg:w-full lg:max-w-md z-50"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  Step {currentStep + 1} of {totalSteps}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={endTour}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-xl font-bold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-1.5 pb-4">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-primary w-6'
                    : index < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="p-4 border-t border-border/50 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={isFirstStep}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                endTour();
              }}
              className="text-muted-foreground"
            >
              Skip Tour
            </Button>

            <Button
              onClick={nextStep}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
