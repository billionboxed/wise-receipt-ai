import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/context/OnboardingContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  MousePointerClick,
  Hand,
  Plus,
  Pencil,
  Trash2,
  Archive,
  Sparkles
} from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  action?: string;
  icon: React.ElementType;
  route?: string;
  elementSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  waitForAction?: boolean;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome! Let\'s Get Started',
    description: 'This interactive tour will guide you through the key features. Follow along to learn how to manage your expenses like a pro!',
    icon: Sparkles,
    route: '/',
    position: 'center',
  },
  {
    id: 'add-transaction',
    title: 'Add Your First Transaction',
    description: 'Click the "Add Transaction" button to create your first expense entry.',
    action: 'Tap "Add Transaction" button',
    icon: Plus,
    route: '/transactions',
    elementSelector: '[data-tour="add-transaction"]',
    position: 'bottom',
    waitForAction: true,
  },
  {
    id: 'fill-transaction',
    title: 'Fill In The Details',
    description: 'Enter the date, description, amount, select a category, account, and optionally add tags. Then save it!',
    action: 'Complete the form and save',
    icon: Pencil,
    position: 'center',
    waitForAction: true,
  },
  {
    id: 'swipe-actions',
    title: 'Swipe To Edit or Delete',
    description: 'On any transaction: swipe LEFT to edit, swipe RIGHT to delete. Try it on a transaction!',
    action: 'Swipe a transaction left or right',
    icon: Hand,
    route: '/transactions',
    position: 'center',
  },
  {
    id: 'long-press',
    title: 'Bulk Selection Mode',
    description: 'Long-press on any transaction to enter selection mode. Then tap other transactions to select multiple items for bulk delete.',
    action: 'Try long-pressing a transaction',
    icon: MousePointerClick,
    route: '/transactions',
    position: 'center',
  },
  {
    id: 'categories',
    title: 'Manage Categories',
    description: 'Categories have two levels: Main category (e.g., "Food") and Sub-category (e.g., "Restaurants"). Create your own hierarchy here!',
    action: 'Explore or add a category',
    icon: Plus,
    route: '/settings/categories',
    position: 'center',
  },
  {
    id: 'tags',
    title: 'Create & Archive Tags',
    description: 'Tags help cross-categorize expenses. Mark a tag as "Project" to track one-off expenses separately. Archive old tags to hide them from new entries while keeping historical data.',
    action: 'Try creating or archiving a tag',
    icon: Archive,
    route: '/settings/tags',
    position: 'center',
  },
  {
    id: 'ai-assistant',
    title: 'Meet Your AI Assistant',
    description: 'Add expenses naturally: "I spent ₹500 on groceries" or ask "What did I spend on food this month?" The AI understands context!',
    action: 'Try the AI chat anytime',
    icon: Sparkles,
    route: '/ai-chat',
    position: 'center',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🎉',
    description: 'You now know the essentials. Explore Analytics for insights, Upload to import bank statements, and Settings for more customization. Happy tracking!',
    icon: Sparkles,
    route: '/',
    position: 'center',
  },
];

export function OnboardingTour() {
  const { isTourActive, currentStep, totalSteps, nextStep, prevStep, endTour, goToStep } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const step = tourSteps[currentStep];

  // Find and highlight the target element
  const updateHighlight = useCallback(() => {
    if (!step?.elementSelector) {
      setHighlightRect(null);
      return;
    }

    const element = document.querySelector(step.elementSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setHighlightRect(rect);
    } else {
      setHighlightRect(null);
    }
  }, [step?.elementSelector]);

  // Navigate to step's route
  useEffect(() => {
    if (isTourActive && step?.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [isTourActive, currentStep, step?.route, location.pathname, navigate]);

  // Update highlight on step change and window resize
  useEffect(() => {
    if (!isTourActive) return;
    
    const timer = setTimeout(updateHighlight, 300);
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight);
    };
  }, [isTourActive, currentStep, updateHighlight]);

  if (!isTourActive || !step) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const Icon = step.icon;
  const isCentered = step.position === 'center' || !highlightRect;

  return (
    <AnimatePresence>
      {/* Backdrop with spotlight cutout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 pointer-events-none"
        style={{
          background: highlightRect
            ? `radial-gradient(circle at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent ${Math.max(highlightRect.width, highlightRect.height) / 2 + 20}px, rgba(0,0,0,0.75) ${Math.max(highlightRect.width, highlightRect.height) / 2 + 40}px)`
            : 'rgba(0,0,0,0.75)',
        }}
      />

      {/* Clickable overlay to skip */}
      <div 
        className="fixed inset-0 z-50"
        onClick={(e) => {
          // Allow clicks on highlighted element
          if (highlightRect) {
            const x = e.clientX;
            const y = e.clientY;
            if (
              x >= highlightRect.left &&
              x <= highlightRect.right &&
              y >= highlightRect.top &&
              y <= highlightRect.bottom
            ) {
              // Click is on the highlighted element, let it through
              return;
            }
          }
          e.stopPropagation();
        }}
      />

      {/* Highlight ring around target element */}
      {highlightRect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed z-50 pointer-events-none"
          style={{
            left: highlightRect.left - 4,
            top: highlightRect.top - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            border: '2px solid hsl(var(--primary))',
            borderRadius: '12px',
            boxShadow: '0 0 0 4px hsl(var(--primary) / 0.3), 0 0 20px hsl(var(--primary) / 0.5)',
          }}
        />
      )}

      {/* Tour Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`fixed z-50 ${
          isCentered
            ? 'inset-x-4 bottom-24 lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:inset-auto lg:w-full lg:max-w-md'
            : 'left-4 right-4 lg:left-auto lg:right-auto lg:w-96'
        }`}
        style={
          !isCentered && highlightRect
            ? {
                top: highlightRect.bottom + 16,
                left: Math.max(16, Math.min(highlightRect.left, window.innerWidth - 400)),
              }
            : undefined
        }
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Step {currentStep + 1} of {totalSteps}
              </span>
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
          <div className="p-5">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-lg font-bold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {step.description}
              </p>
              {step.action && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <MousePointerClick className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-primary">{step.action}</span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-1.5 pb-3">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-primary w-6'
                    : index < currentStep
                    ? 'bg-primary/50 w-2 hover:bg-primary/70'
                    : 'bg-muted w-2 hover:bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="p-4 border-t border-border/50 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              disabled={isFirstStep}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={endTour}
              className="text-muted-foreground"
            >
              Skip
            </Button>

            <Button
              size="sm"
              onClick={nextStep}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
