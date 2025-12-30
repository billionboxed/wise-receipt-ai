import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { useExpense } from '@/context/ExpenseContext';
import { FolderTree } from 'lucide-react';

export default function CategoriesSettings() {
  const { categories } = useExpense();
  const mainCategories = [...new Set(categories.map(c => c.main))];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage your expense categories</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mainCategories.map((main, i) => (
            <motion.div
              key={main}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 shadow-card border border-border/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <FolderTree className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">{main}</h3>
              </div>
              <div className="space-y-1">
                {categories.filter(c => c.main === main).map(cat => (
                  <div key={cat.id} className="text-sm text-muted-foreground pl-8">
                    {cat.sub}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
