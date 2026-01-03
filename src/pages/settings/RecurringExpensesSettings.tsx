import { Layout } from '@/components/layout/Layout';
import { RecurringExpenseManager } from '@/components/settings/RecurringExpenseManager';

export default function RecurringExpensesSettings() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            Recurring Expenses
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage subscriptions and monthly bills
          </p>
        </div>
        <RecurringExpenseManager />
      </div>
    </Layout>
  );
}