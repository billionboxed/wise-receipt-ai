import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { useExpense } from '@/context/ExpenseContext';
import { Badge } from '@/components/ui/badge';

export default function TagsSettings() {
  const { tags } = useExpense();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground mt-1">Manage transaction tags</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {tags.map((tag, i) => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Badge
                variant="secondary"
                className="text-sm py-2 px-4"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </Badge>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
