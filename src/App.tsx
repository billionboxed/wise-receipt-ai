import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ExpenseProvider } from "@/context/ExpenseContext";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import UploadPage from "./pages/UploadPage";
import Analytics from "./pages/Analytics";
import CategoriesSettings from "./pages/settings/CategoriesSettings";
import TagsSettings from "./pages/settings/TagsSettings";
import AccountsSettings from "./pages/settings/AccountsSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ExpenseProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings/categories" element={<CategoriesSettings />} />
            <Route path="/settings/tags" element={<TagsSettings />} />
            <Route path="/settings/accounts" element={<AccountsSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ExpenseProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
