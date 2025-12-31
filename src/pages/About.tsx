import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Download, 
  Share, 
  Plus,
  PieChart,
  Upload,
  Tags,
  Wallet,
  TrendingUp,
  Shield,
  Zap,
  Cloud,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: Wallet,
    title: 'Account Management',
    description: 'Track multiple bank accounts, credit cards, and wallets in one place.'
  },
  {
    icon: PieChart,
    title: 'Visual Analytics',
    description: 'Beautiful charts showing spending by category, trends over time, and tag-based insights.'
  },
  {
    icon: Upload,
    title: 'Smart Import',
    description: 'Upload bank statements (PDF, CSV, Excel) and automatically extract transactions.'
  },
  {
    icon: Tags,
    title: 'Custom Tags & Categories',
    description: 'Organize transactions with custom tags and categories for detailed tracking.'
  },
  {
    icon: TrendingUp,
    title: 'Spending Trends',
    description: 'Monitor your spending patterns and compare month-over-month changes.'
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your financial data is encrypted and stored securely in the cloud.'
  },
  {
    icon: Zap,
    title: 'Fast & Responsive',
    description: 'Optimized for speed with instant updates and smooth animations.'
  },
  {
    icon: Cloud,
    title: 'Cloud Sync',
    description: 'Access your data from any device with automatic cloud synchronization.'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/30">
            <Wallet className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">ClearSpends</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Your personal expense tracker. Simple, powerful, and beautifully designed to help you understand your spending.
          </p>
        </motion.div>

        {/* Features Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-12"
        >
          <h2 className="text-2xl font-semibold mb-6 text-center">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Supported Devices Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-semibold mb-6 text-center">Supported Devices</h2>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                    <Smartphone className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-medium mb-2">Mobile</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>iPhone (iOS 12+)</li>
                    <li>Android phones</li>
                    <li>Install as app</li>
                  </ul>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                    <Tablet className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-medium mb-2">Tablet</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>iPad (iPadOS 12+)</li>
                    <li>Android tablets</li>
                    <li>Optimized layout</li>
                  </ul>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                    <Monitor className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-medium mb-2">Desktop</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Chrome, Edge, Firefox</li>
                    <li>Safari, Opera</li>
                    <li>Windows, Mac, Linux</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* How to Install Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-semibold mb-6 text-center">How to Install</h2>
          
          <div className="space-y-4">
            {/* Android / Chrome */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Download className="w-4 h-4 text-green-500" />
                  </div>
                  Android / Chrome
                </CardTitle>
                <CardDescription>Install directly from your browser</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                  <p className="text-sm">Open the app in <strong>Chrome</strong> or <strong>Edge</strong> browser</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                  <p className="text-sm">Look for the <strong>"Install"</strong> prompt at the bottom of the screen, or tap the browser menu (⋮)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                  <p className="text-sm">Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
                  <p className="text-sm">Confirm and the app will appear on your home screen</p>
                </div>
              </CardContent>
            </Card>

            {/* iOS / Safari */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Share className="w-4 h-4 text-blue-500" />
                  </div>
                  iPhone / iPad (Safari)
                </CardTitle>
                <CardDescription>Add to your home screen manually</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                  <p className="text-sm">Open the app in <strong>Safari</strong> browser (required for iOS)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                  <p className="text-sm flex items-center gap-1">
                    Tap the <strong>Share</strong> button <Share className="w-4 h-4 inline" /> at the bottom of the screen
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                  <p className="text-sm flex items-center gap-1">
                    Scroll down and tap <strong>"Add to Home Screen"</strong> <Plus className="w-4 h-4 inline" />
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
                  <p className="text-sm">Tap <strong>"Add"</strong> in the top right corner</p>
                </div>
              </CardContent>
            </Card>

            {/* Desktop */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-purple-500" />
                  </div>
                  Desktop (Chrome / Edge)
                </CardTitle>
                <CardDescription>Install as a desktop application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                  <p className="text-sm">Open the app in <strong>Chrome</strong> or <strong>Edge</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                  <p className="text-sm">Look for the <strong>install icon</strong> in the address bar (right side)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                  <p className="text-sm">Click <strong>"Install"</strong> to add it as a standalone app</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.section>

        {/* Benefits of Installing */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-semibold mb-6 text-center">Why Install?</h2>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Works offline</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Faster loading times</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Full-screen experience</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Home screen access</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">No app store needed</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Always up to date</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Back Button */}
        <div className="text-center">
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
