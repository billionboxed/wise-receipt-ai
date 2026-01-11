import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { TransactionDialogProvider } from "@/context/TransactionDialogContext";
import { AnalyticsFilterProvider } from "@/context/AnalyticsFilterContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { handleAuthDeepLink, isAuthCallback } from "@/utils/capacitorAuth";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import UploadPage from "./pages/UploadPage";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import About from "./pages/About";
import AboutPrint from "./pages/AboutPrint";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Landing from "./pages/Landing";
import CategoriesSettings from "./pages/settings/CategoriesSettings";
import TagsSettings from "./pages/settings/TagsSettings";
import AccountsSettings from "./pages/settings/AccountsSettings";
import CurrencySettings from "./pages/settings/CurrencySettings";
import ThemeSettings from "./pages/settings/ThemeSettings";
import SettingsHub from "./pages/settings/SettingsHub";
import RecurringExpensesSettings from "./pages/settings/RecurringExpensesSettings";
import DataSettings from "./pages/settings/DataSettings";
import AIChat from "./pages/AIChat";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

// Deep link listener for Capacitor
const DeepLinkHandler = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Check if we're in a native Capacitor app
    const Capacitor = (window as any).Capacitor;
    if (!Capacitor?.isNativePlatform?.()) return;

    // Dynamic import of Capacitor App plugin
    const setupDeepLinkListener = async () => {
      try {
        const { App } = await import('@capacitor/app');
        
        // Handle app URL open (deep links)
        App.addListener('appUrlOpen', async (event: { url: string }) => {
          console.log('Deep link received:', event.url);
          
          if (isAuthCallback(event.url)) {
            const result = await handleAuthDeepLink(event.url);
            if (!result.error) {
              navigate('/dashboard', { replace: true });
            }
          }
        });

        // Also check if app was opened with a URL initially
        const urlOpen = await App.getLaunchUrl();
        if (urlOpen?.url && isAuthCallback(urlOpen.url)) {
          console.log('App launched with auth URL:', urlOpen.url);
          const result = await handleAuthDeepLink(urlOpen.url);
          if (!result.error) {
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (error) {
        console.log('Capacitor App plugin not available:', error);
      }
    };

    setupDeepLinkListener();
  }, [navigate]);

  // Redirect to dashboard if user becomes authenticated
  useEffect(() => {
    if (user && window.location.pathname === '/auth') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return null;
};

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <ExpenseProvider>
      <AnalyticsFilterProvider>
        <TransactionDialogProvider>
          <OnboardingTour />
          {children}
        </TransactionDialogProvider>
      </AnalyticsFilterProvider>
    </ExpenseProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/install" element={<Install />} />
      <Route path="/about" element={<About />} />
      <Route path="/about/print" element={<AboutPrint />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsHub /></ProtectedRoute>} />
      <Route path="/settings/categories" element={<ProtectedRoute><CategoriesSettings /></ProtectedRoute>} />
      <Route path="/settings/tags" element={<ProtectedRoute><TagsSettings /></ProtectedRoute>} />
      <Route path="/settings/accounts" element={<ProtectedRoute><AccountsSettings /></ProtectedRoute>} />
      <Route path="/settings/currency" element={<ProtectedRoute><CurrencySettings /></ProtectedRoute>} />
      <Route path="/settings/theme" element={<ProtectedRoute><ThemeSettings /></ProtectedRoute>} />
      <Route path="/settings/recurring" element={<ProtectedRoute><RecurringExpensesSettings /></ProtectedRoute>} />
      <Route path="/settings/data" element={<ProtectedRoute><DataSettings /></ProtectedRoute>} />
      <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <CurrencyProvider>
          <OnboardingProvider>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <DeepLinkHandler />
                <AppRoutes />
              </BrowserRouter>
            </AuthProvider>
          </OnboardingProvider>
        </CurrencyProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
