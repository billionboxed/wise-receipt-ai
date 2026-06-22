import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  PieChart, 
  TrendingUp, 
  MessageSquare, 
  Upload, 
  Shield, 
  Smartphone,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/ui/Logo";
import { Seo } from "@/components/Seo";
import mockupDashboard from "@/assets/mockup-dashboard-new.png";
import mockupAnalytics from "@/assets/mockup-analytics.png";
import mockupAiChat from "@/assets/mockup-ai-chat.png";

const features = [
  {
    icon: PieChart,
    title: "Expense Categories",
    description: "Organize your spending with customizable categories and subcategories for detailed tracking."
  },
  {
    icon: TrendingUp,
    title: "Smart Analytics",
    description: "Visualize your spending patterns with year-over-year comparisons and trend analysis."
  },
  {
    icon: MessageSquare,
    title: "AI Assistant",
    description: "Chat with our AI to log expenses naturally and get personalized spending insights."
  },
  {
    icon: Upload,
    title: "PDF Import",
    description: "Upload bank statements and let AI automatically categorize your transactions."
  },
  {
    icon: BarChart3,
    title: "Spending Forecast",
    description: "Predict your monthly spending with our hybrid AI forecasting model."
  },
  {
    icon: Smartphone,
    title: "Works Everywhere",
    description: "Access your expenses on any device with our responsive progressive web app."
  }
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export default function Landing() {
  const { user, loading } = useAuth();

  // Show nothing while checking auth to prevent flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect authenticated users to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="ClearSpends — AI-powered expense tracker"
        description="Take control of your spending. Import bank statements, log expenses with natural language, and get AI insights — free with ClearSpends."
        path="/"
      />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Logo size="md" />
              <span className="text-xl font-bold">Clear Spends</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/about">
                <Button variant="ghost" size="sm">About</Button>
              </Link>
              <Link to="/auth">
                <Button variant="default" size="sm">
                  Sign In <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Take Control of Your
              <span className="block mt-2">Spending Habits</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Clear Spends helps you understand where your money goes. Track expenses, 
              analyze patterns, and make smarter financial decisions with AI-powered insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto text-base px-8">
                  Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8">
                  Explore features
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Hero Image */}
          <motion.div 
            className="mt-16 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl">
              <img 
                src={mockupDashboard} 
                alt="Clear Spends Dashboard" 
                width={1356}
                height={532}
                fetchPriority="high"
                decoding="async"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            {...fadeInUp}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to Track Expenses
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to give you complete visibility into your spending.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="p-6 rounded-xl bg-card border border-border hover:border-foreground/20 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-12 h-12 rounded-lg bg-foreground/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics Screenshot */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Deep Insights Into Your Spending
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our analytics dashboard gives you a comprehensive view of your expenses 
                with year-over-year comparisons, spending trends, and category breakdowns.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                    <span className="text-background text-sm">✓</span>
                  </div>
                  <span>Year-over-year spending comparison</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                    <span className="text-background text-sm">✓</span>
                  </div>
                  <span>Day-of-week spending patterns</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                    <span className="text-background text-sm">✓</span>
                  </div>
                  <span>AI-powered spending forecast</span>
                </li>
              </ul>
            </motion.div>
            <motion.div
              className="rounded-2xl overflow-hidden border border-border shadow-xl"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <img 
                src={mockupAnalytics} 
                alt="Clear Spends Analytics" 
                className="w-full h-auto"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Chat Screenshot */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              className="rounded-2xl overflow-hidden border border-border shadow-xl order-2 lg:order-1"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <img 
                src={mockupAiChat} 
                alt="Clear Spends AI Chat" 
                className="w-full h-auto"
              />
            </motion.div>
            <motion.div
              className="order-1 lg:order-2"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Log Expenses With Natural Language
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Just tell our AI what you spent and it will automatically categorize 
                and log your expense. No forms, no hassle.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                    <span className="text-background text-sm">✓</span>
                  </div>
                  <span>Natural language expense logging</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                    <span className="text-background text-sm">✓</span>
                  </div>
                  <span>Smart category suggestions</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                    <span className="text-background text-sm">✓</span>
                  </div>
                  <span>Conversational spending insights</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 rounded-2xl bg-foreground/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-foreground" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Your Data, Secured
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              We use industry-standard encryption and security practices to keep your 
              financial data safe. Your information is never shared or sold.
            </p>
            <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
              <span className="px-4 py-2 rounded-full border border-border">End-to-end encryption</span>
              <span className="px-4 py-2 rounded-full border border-border">Secure authentication</span>
              <span className="px-4 py-2 rounded-full border border-border">No third-party sharing</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-foreground text-background">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Take Control?
            </h2>
            <p className="text-lg opacity-80 mb-8">
              Join thousands of users who have transformed their spending habits with Clear Spends.
            </p>
            <Link to="/auth">
              <Button 
                size="lg" 
                variant="secondary"
                className="text-base px-8 bg-background text-foreground hover:bg-background/90"
              >
                Start Tracking Free <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="font-semibold">Clear Spends</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Clear Spends. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
