import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useCurrency, currencies } from '@/context/CurrencyContext';
import { cn } from '@/lib/utils';

export default function CurrencySettings() {
  const navigate = useNavigate();
  const { currency, setCurrency, formatAmount } = useCurrency();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="h-10 w-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Currency
            </h1>
            <p className="text-muted-foreground mt-1">
              Choose your preferred currency
            </p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">Current Currency</p>
              <p className="text-sm text-muted-foreground">
                Preview: {formatAmount(1234.56)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {currencies.map((curr, i) => (
            <motion.button
              key={curr.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setCurrency(curr)}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300',
                'glass-card border border-white/5 hover:border-white/10',
                currency.code === curr.code && 'border-primary/50 bg-primary/5'
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-xl font-semibold">
                  {curr.symbol}
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{curr.name}</p>
                  <p className="text-sm text-muted-foreground">{curr.code}</p>
                </div>
              </div>
              {currency.code === curr.code && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
