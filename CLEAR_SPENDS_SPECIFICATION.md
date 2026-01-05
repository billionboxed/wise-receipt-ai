# Clear Spends - Expense Tracker Application
## Complete Technical Specification Document

**Version:** 1.0  
**Last Updated:** January 2025  
**Platform:** Web (PWA-ready) + Mobile (Capacitor)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Core Philosophy](#2-core-philosophy)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [Authentication System](#5-authentication-system)
6. [Page Structure & Routes](#6-page-structure--routes)
7. [Feature Specifications](#7-feature-specifications)
8. [UI/UX Patterns](#8-uiux-patterns)
9. [Design System](#9-design-system)
10. [AI Integration](#10-ai-integration)
11. [Data Import/Export](#11-data-importexport)
12. [Analytics & Insights](#12-analytics--insights)
13. [Mobile Considerations](#13-mobile-considerations)

---

## 1. Product Overview

### 1.1 Application Name
**Clear Spends** - A focused expense tracking application designed to help users understand and manage their spending habits.

### 1.2 Target Users
- Individuals seeking simple expense tracking
- Users who want focused spending analysis without complex budgeting
- Mobile-first users who need quick expense entry

### 1.3 Key Value Proposition
- **Simplicity**: Expense-only tracking without income/balance complexity
- **AI-Assisted**: Smart categorization and natural language expense entry
- **Multi-format Import**: Support for bank statements (PDF, CSV, Excel)
- **Cross-platform**: PWA + native mobile apps via Capacitor

---

## 2. Core Philosophy

### 2.1 Expense-Only Focus
The application intentionally **excludes**:
- Income tracking
- Credit/balance tracking
- Budget planning features

**Rationale**: Individual expense awareness is the primary driver of financial health. By focusing solely on where money goes, users gain clarity without complexity.

### 2.2 Transaction Types
- All new transactions default to **'debit'** (expense)
- Credit transactions are automatically **filtered out** during file imports
- The system tracks expenses, not cash flow

---

## 3. Technology Stack

### 3.1 Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Tailwind CSS | Styling |
| shadcn/ui | Component Library |
| Framer Motion | Animations |
| React Router v6 | Routing |
| TanStack Query | Data Fetching |
| Recharts | Charts/Visualizations |

### 3.2 Backend (Supabase/Lovable Cloud)
| Service | Purpose |
|---------|---------|
| PostgreSQL | Database |
| Supabase Auth | Authentication |
| Edge Functions | Serverless Logic |
| Row Level Security | Data Isolation |

### 3.3 Mobile
| Technology | Purpose |
|------------|---------|
| Capacitor | Native Mobile Wrapper |
| PWA | Progressive Web App |

### 3.4 Key Dependencies
```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "@supabase/supabase-js": "^2.89.0",
  "@tanstack/react-query": "^5.83.0",
  "framer-motion": "^12.23.26",
  "recharts": "^2.15.4",
  "date-fns": "^3.6.0",
  "xlsx": "^0.18.5",
  "pdfjs-dist": "^4.0.379",
  "zod": "^3.25.76"
}
```

---

## 4. Database Schema

### 4.1 Tables Overview

#### 4.1.1 `transactions`
Primary table for all expense records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner reference |
| date | date | No | - | Transaction date |
| description | text | No | - | Transaction description |
| amount | numeric | No | - | Transaction amount |
| type | text | No | - | 'debit' or 'credit' |
| category_id | uuid | Yes | - | FK to categories |
| account_id | uuid | Yes | - | FK to accounts |
| tag_ids | uuid[] | Yes | '{}' | Array of tag IDs |
| status | text | No | 'confirmed' | 'confirmed', 'pending', 'skipped' |
| ai_suggested | boolean | Yes | false | AI-generated flag |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

#### 4.1.2 `categories`
Two-tier category system (Main > Sub).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner reference |
| main | text | No | - | Main category name |
| sub | text | No | - | Subcategory name |
| combined | text | No | - | "Main > Sub" format |
| created_at | timestamptz | No | now() | Creation timestamp |

#### 4.1.3 `tags`
Flexible tagging system for cross-category grouping.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner reference |
| name | text | No | - | Tag name |
| color | text | No | - | Hex color code |
| is_project | boolean | No | false | Project tag flag |
| is_archived | boolean | No | false | Archive status |
| created_at | timestamptz | No | now() | Creation timestamp |

#### 4.1.4 `accounts`
Payment method/source tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner reference |
| name | text | No | - | Account name |
| type | text | No | - | 'bank', 'credit', 'cash', 'wallet' |
| created_at | timestamptz | No | now() | Creation timestamp |

#### 4.1.5 `recurring_expenses`
Subscription and recurring payment tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner reference |
| description | text | No | - | Expense description |
| amount | numeric | No | - | Recurring amount |
| frequency | text | No | 'monthly' | 'weekly', 'bi-weekly', 'monthly', 'quarterly' |
| day_of_month | integer | Yes | 1 | Day expense occurs |
| category_id | uuid | Yes | - | FK to categories |
| account_id | uuid | Yes | - | FK to accounts |
| tag_ids | uuid[] | Yes | '{}' | Array of tag IDs |
| is_active | boolean | Yes | true | Active status |
| last_added_date | date | Yes | - | Last auto-added date |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

### 4.2 Row Level Security (RLS)

All tables have RLS enabled with the following policy pattern:

```sql
-- SELECT: Users can view their own data
CREATE POLICY "Users can view their own [table]"
ON public.[table] FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can create their own data
CREATE POLICY "Users can create their own [table]"
ON public.[table] FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own data
CREATE POLICY "Users can update their own [table]"
ON public.[table] FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: Users can delete their own data
CREATE POLICY "Users can delete their own [table]"
ON public.[table] FOR DELETE
USING (auth.uid() = user_id);
```

### 4.3 Database Functions

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for transactions
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 5. Authentication System

### 5.1 Supported Methods
1. **Email/Password** - Primary authentication
2. **Google OAuth** - Social login

### 5.2 Configuration
- **Auto-confirm email**: Enabled for faster onboarding
- **Password HIBP Check**: Enabled for leaked password protection
- **Anonymous users**: Disabled

### 5.3 Auth Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Landing   │───▶│    Auth     │───▶│  Dashboard  │
│     "/"     │    │   "/auth"   │    │ "/dashboard"│
└─────────────┘    └─────────────┘    └─────────────┘
       │                                     ▲
       │         (if authenticated)          │
       └─────────────────────────────────────┘
```

### 5.4 Protected Routes
All routes except the following require authentication:
- `/` (Landing)
- `/auth` (Login/Signup)
- `/privacy` (Privacy Policy)
- `/terms` (Terms of Service)
- `/install` (App Installation Guide)
- `/about` (About Page)

### 5.5 Session Management
- Session persistence via Supabase Auth
- Token auto-refresh
- OAuth redirect loop prevention with pending state management

---

## 6. Page Structure & Routes

### 6.1 Public Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Landing | Marketing/hero page |
| `/auth` | Auth | Login & signup forms |
| `/privacy` | PrivacyPolicy | Privacy policy page |
| `/terms` | TermsOfService | Terms of service page |
| `/install` | Install | PWA installation guide |
| `/about` | About | About the application |

### 6.2 Protected Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | Dashboard | Main dashboard with stats & charts |
| `/transactions` | Transactions | Transaction list & management |
| `/upload` | UploadPage | File upload for imports |
| `/analytics` | Analytics | Advanced analytics & insights |
| `/ai-chat` | AIChat | AI financial assistant |
| `/settings` | SettingsHub | Settings navigation hub |
| `/settings/appearance` | ThemeSettings | Theme customization |
| `/settings/categories` | CategoriesSettings | Category management |
| `/settings/tags` | TagsSettings | Tag management |
| `/settings/accounts` | AccountsSettings | Account management |
| `/settings/recurring` | RecurringExpensesSettings | Recurring expense rules |
| `/settings/currency` | CurrencySettings | Currency selection |
| `/settings/data` | DataSettings | Import/Export data |

### 6.3 Navigation Structure

#### Desktop Sidebar
```
Logo: Clear Spends
─────────────────
📊 Dashboard
💳 Transactions
📤 Upload
📈 Analytics
─────────────────
SETTINGS
📁 Categories
🏷️ Tags
🏦 Accounts
🔄 Recurring
💵 Currency
📥 Import & Export
⚙️ Settings
─────────────────
User Info
🚪 Sign Out
```

#### Mobile Bottom Navigation
```
┌────────────────────────────────────────┐
│  🏠      💳       📤       📈      💬  │
│ Home  Transact  Upload  Analytics  AI  │
└────────────────────────────────────────┘
```

---

## 7. Feature Specifications

### 7.1 Transaction Management

#### 7.1.1 Transaction Dialog (Add/Edit)
**Fields:**
- Date (date picker, required)
- Description (text input, required)
- Amount (number input, required)
- Category (select dropdown, optional)
- Account (select dropdown, optional)
- Tags (multi-select badges, optional)

**Features:**
- Duplicate detection (same date + amount + type)
- Pre-fill support for AI-generated entries
- Edit mode with existing data population

#### 7.1.2 Transaction List
**Display:**
- Date, description, category, account, tags, amount
- Type indicator (debit/credit icon)
- Status badge (confirmed/pending/skipped)

**Interactions:**
- Swipe left: Edit transaction
- Swipe right: Delete transaction (with 5-second undo toast)
- Long press: Enter multi-selection mode
- Tap (in selection mode): Toggle selection

**Bulk Actions:**
- Delete selected
- Change category (bulk)
- Change account (bulk)
- Add tag (bulk)

### 7.2 Category Management

#### 7.2.1 Structure
Two-tier hierarchy: **Main Category > Subcategory**

Examples:
- Food & Dining > Restaurants
- Food & Dining > Groceries
- Transportation > Fuel
- Transportation > Public Transit

#### 7.2.2 CRUD Operations
- **Create**: Add main category, then subcategories under it
- **Update**: Edit name of main or subcategory
- **Delete**: Safe deletion with reassignment prompt

#### 7.2.3 Safe Deletion Flow
When deleting a category with linked transactions:
1. Show count of affected transactions
2. Prompt user to:
   - Reassign to another category, OR
   - Clear category (set to "Uncategorized")
3. Execute chosen action
4. Delete category

### 7.3 Tag Management

#### 7.3.1 Properties
- Name (text)
- Color (hex color picker)
- Is Project (boolean) - special tag type
- Is Archived (boolean) - soft delete

#### 7.3.2 Archive Behavior
- Archived tags remain on existing transactions
- Display with "(archived)" label
- Hidden from new transaction forms
- Can be unarchived

### 7.4 Account Management

#### 7.4.1 Account Types
| Type | Icon | Description |
|------|------|-------------|
| bank | 🏦 | Bank accounts |
| credit | 💳 | Credit cards |
| cash | 💵 | Cash transactions |
| wallet | 👛 | Digital wallets |

#### 7.4.2 Safe Deletion
Same pattern as categories - reassign or clear before delete.

### 7.5 Recurring Expenses

#### 7.5.1 Frequency Options
- Weekly
- Bi-weekly (every 2 weeks)
- Monthly
- Quarterly

#### 7.5.2 Rule Properties
- Description
- Amount
- Frequency
- Day of month (for monthly/quarterly)
- Category (optional)
- Account (optional)
- Tags (optional)
- Active status

#### 7.5.3 Behavior
- Rules are manual (no auto-generation)
- Used for analytics (subscription tracking)
- Deleting rule doesn't affect past transactions

### 7.6 Currency Support

#### 7.6.1 Supported Currencies
| Code | Symbol | Name |
|------|--------|------|
| INR | ₹ | Indian Rupee |
| USD | $ | US Dollar |
| EUR | € | Euro |
| GBP | £ | British Pound |
| JPY | ¥ | Japanese Yen |
| AUD | A$ | Australian Dollar |
| CAD | C$ | Canadian Dollar |

#### 7.6.2 Implementation
- Currency stored in context
- Format: `{symbol}{amount.toLocaleString()}`
- Indian locale for INR: `₹1,23,456`

---

## 8. UI/UX Patterns

### 8.1 Layout Structure

#### 8.1.1 Desktop Layout
```
┌──────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────────┐  │
│ │          │ │                                │  │
│ │ Sidebar  │ │        Main Content            │  │
│ │ (256px)  │ │                                │  │
│ │          │ │                                │  │
│ │          │ │                                │  │
│ └──────────┘ └────────────────────────────────┘  │
│                              ┌─────────────────┐ │
│                              │  AI Chat FAB    │ │
│                              └─────────────────┘ │
└──────────────────────────────────────────────────┘
```

#### 8.1.2 Mobile Layout
```
┌─────────────────────────┐
│      Main Content       │
│                         │
│                         │
│                         │
│                         │
├─────────────────────────┤
│     Bottom Nav Bar      │
└─────────────────────────┘
```

### 8.2 Animation Patterns

#### 8.2.1 Page Transitions
```typescript
<motion.main
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
>
```

#### 8.2.2 List Item Animations
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.05 }}
>
```

#### 8.2.3 Stagger Children
```typescript
<motion.div
  variants={{
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }}
  initial="hidden"
  animate="show"
>
```

### 8.3 Swipe Gestures (Mobile)

#### 8.3.1 Transaction Card Swipe
- **Left swipe (>50px)**: Reveal edit action
- **Right swipe (>50px)**: Reveal delete action
- **Threshold**: 50px minimum displacement
- **Visual feedback**: Background color reveals action icons

#### 8.3.2 Implementation Pattern
```typescript
const handleSwipe = (direction: 'left' | 'right') => {
  if (direction === 'left') {
    onEdit(transaction);
  } else {
    onDelete(transaction);
  }
};
```

### 8.4 Selection Mode

#### 8.4.1 Activation
- Long press (500ms) on any transaction card
- Shows selection count in header

#### 8.4.2 Behavior
- Swipe gestures disabled during selection
- Tap to toggle selection
- Bulk action bar appears at top

### 8.5 Toast Notifications

#### 8.5.1 Types
- **Success**: Green, checkmark icon
- **Error**: Red, X icon
- **Info**: Blue, info icon
- **Warning**: Yellow, alert icon

#### 8.5.2 Undo Pattern
```typescript
toast({
  title: "Transaction deleted",
  description: "This action can be undone",
  action: (
    <Button onClick={handleUndo}>Undo</Button>
  ),
  duration: 5000, // 5 second undo window
});
```

### 8.6 Dialog/Sheet Scrolling

All overlays must be scrollable:
```css
.dialog-content {
  max-height: 90vh;
  overflow-y: auto;
}
```

---

## 9. Design System

### 9.1 Theme Configuration

#### 9.1.1 Color Tokens (CSS Variables)
```css
:root {
  /* Base */
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  
  /* Muted */
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  
  /* Card */
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  
  /* Popover */
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;
  
  /* Primary */
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  
  /* Secondary */
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  
  /* Accent */
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  
  /* Destructive */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  
  /* Border/Ring */
  --border: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
  
  /* Radius */
  --radius: 0.5rem;
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... inverted values */
}
```

### 9.2 Default Theme
**Monochrome** - Clean, minimalist white-base with black accents.

### 9.3 Typography

#### 9.3.1 Font Family
System fonts with fallbacks:
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

#### 9.3.2 Size Scale
| Class | Size | Use Case |
|-------|------|----------|
| text-xs | 0.75rem | Metadata, timestamps |
| text-sm | 0.875rem | Secondary text |
| text-base | 1rem | Body text |
| text-lg | 1.125rem | Subheadings |
| text-xl | 1.25rem | Section titles |
| text-2xl | 1.5rem | Page titles (mobile) |
| text-3xl | 1.875rem | Page titles (desktop) |

### 9.4 Spacing

#### 9.4.1 Component Padding
- Mobile: `p-3` to `p-4` (12-16px)
- Desktop: `p-6` to `p-8` (24-32px)

#### 9.4.2 Card Styling
```css
.card {
  padding: 1rem; /* p-4 */
  border-radius: 0.5rem; /* rounded-lg */
  background: var(--card);
  border: 1px solid var(--border);
}
```

### 9.5 Responsive Breakpoints

| Breakpoint | Width | Typical Use |
|------------|-------|-------------|
| sm | 640px | Small tablets |
| md | 768px | Tablets |
| lg | 1024px | Laptop/Desktop |
| xl | 1280px | Large desktop |
| 2xl | 1536px | Extra large screens |

---

## 10. AI Integration

### 10.1 AI Chat Feature

#### 10.1.1 Access Points
- Desktop: Floating action button (bottom right)
- Mobile: Bottom navigation tab

#### 10.1.2 Capabilities
- Natural language expense entry
- Spending queries and summaries
- Category suggestions
- Financial insights

#### 10.1.3 Inline Transaction Form
When AI detects an expense intent:
```
User: "I spent $45 on groceries yesterday"
AI: [Renders inline transaction form]
    Date: [Yesterday's date]
    Description: "Groceries"
    Amount: 45
    Category: [Food & Dining > Groceries]
    [Add Transaction] [Cancel]
```

### 10.2 Edge Function: expense-ai-chat

#### 10.2.1 Endpoint
`POST /functions/v1/expense-ai-chat`

#### 10.2.2 Request Format
```typescript
interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  userContext?: {
    categories: Category[];
    accounts: Account[];
    tags: Tag[];
    recentTransactions?: Transaction[];
  };
}
```

#### 10.2.3 Response Format
```typescript
interface ChatResponse {
  message: string;
  suggestedTransaction?: {
    date: string;
    description: string;
    amount: number;
    categoryId?: string;
    accountId?: string;
    tagIds?: string[];
  };
}
```

### 10.3 Edge Function: spending-forecast

#### 10.3.1 Purpose
Generates personalized spending insights using AI.

#### 10.3.2 Algorithm
Hybrid forecast: **40% historical average + 60% run-rate**

```typescript
const projectedTotal = 
  (currentTotal / daysElapsed) * daysInMonth * 0.6 +
  historicalAvg * 0.4;
```

---

## 11. Data Import/Export

### 11.1 Supported Import Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| ClearSpends JSON | .json | Full backup with all metadata |
| CSV | .csv | Standard or ClearSpends format |
| Excel | .xlsx | Standard or ClearSpends format |
| PDF | Bank statements | AI-powered parsing |

### 11.2 ClearSpends JSON Format

```typescript
interface ClearSpendsExport {
  version: string;
  exportType: 'clearspends';
  exportedAt: string;
  data: {
    categories: Array<{
      main: string;
      sub: string;
      combined: string;
    }>;
    tags: Array<{
      name: string;
      color: string;
      isProject: boolean;
      isArchived: boolean;
    }>;
    accounts: Array<{
      name: string;
      type: 'bank' | 'credit' | 'cash' | 'wallet';
    }>;
    transactions: Array<{
      date: string;
      description: string;
      amount: number;
      type: 'debit' | 'credit';
      categoryMain: string;
      categorySub: string;
      accountName: string | null;
      tagNames: string[];
      status: 'confirmed' | 'pending' | 'skipped';
    }>;
  };
}
```

### 11.3 Import Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ File Upload │───▶│   Parse &   │───▶│   Review    │
│             │    │   Analyze   │    │ Transactions│
└─────────────┘    └─────────────┘    └─────────────┘
                                             │
       ┌─────────────────────────────────────┘
       ▼
┌─────────────┐    ┌─────────────┐
│   Confirm   │───▶│  Complete   │
│  Selected   │    │             │
└─────────────┘    └─────────────┘
```

### 11.4 Import Analysis

Before import, system analyzes:
- New vs existing categories
- New vs existing tags
- New vs existing accounts
- Potential duplicate transactions

### 11.5 Transaction Review Interface

#### 11.5.1 Columns (Desktop)
| Column | Description |
|--------|-------------|
| ☑️ | Selection checkbox |
| Date | Transaction date |
| Description | Editable inline |
| Category | Dropdown select |
| Account | Dropdown select |
| Tags | Multi-select |
| Amount | Formatted currency |

#### 11.5.2 Features
- Select all / deselect all
- Bulk category assignment
- Bulk account assignment
- Bulk tag addition
- Duplicate detection & flagging
- Inline description editing

### 11.6 Duplicate Detection

A transaction is flagged as duplicate if it matches:
- Same date
- Same amount
- Same type (debit/credit)

Display: Yellow background with "Duplicate" badge.

### 11.7 PDF Parsing (Edge Function)

#### 11.7.1 Endpoint
`POST /functions/v1/parse-pdf-transactions`

#### 11.7.2 Flow
1. PDF uploaded to client
2. Client extracts text (pdfjs-dist)
3. Text sent to edge function
4. AI parses transaction data
5. Returns structured transactions

---

## 12. Analytics & Insights

### 12.1 Dashboard Components

#### 12.1.1 Stat Cards
| Stat | Description |
|------|-------------|
| Total Spent | Sum of all expenses in period |
| Avg per Day | Total / days in period |
| Transactions | Count of transactions |
| Categories | Count of unique categories used |

#### 12.1.2 Category Chart
- Pie/Donut chart of spending by category
- Legend with amounts and percentages
- Click to drill down (future)

#### 12.1.3 Spending Trend
- Line/area chart of daily/weekly spending
- Comparison with previous period (optional)

#### 12.1.4 Recent Transactions
- Last 5-10 transactions
- Quick access to full list

### 12.2 Analytics Page Components

#### 12.2.1 Year-over-Year Comparison
- Monthly totals current vs previous year
- Bar chart visualization
- Growth/decline indicators

#### 12.2.2 Day of Week Analysis
- Average spending by day of week
- Helps identify spending patterns

#### 12.2.3 Spending Forecast
- Projected month-end total
- AI-generated insight
- Historical comparison

#### 12.2.4 Recurring Expenses Summary
- List of active recurring rules
- Monthly total commitment
- Next occurrence dates

### 12.3 Analytics Filter

#### 12.3.1 Filter Options
| Filter | Options |
|--------|---------|
| View | Day, Week, Month, Year, All Time |
| Date Range | Custom start/end dates |
| Category | Multi-select filter |
| Account | Multi-select filter |
| Tag | Multi-select filter |

#### 12.3.2 Application
Filter applies to both Dashboard and Analytics pages.

### 12.4 Uncategorized Tracking
- Special "Uncategorized" data point in charts
- Visual highlight in transaction lists
- Encourages proper categorization

---

## 13. Mobile Considerations

### 13.1 Responsive Design Principles

#### 13.1.1 Content Density
- Tighter spacing on mobile (`p-3` vs `p-6`)
- Smaller border radius (`rounded-lg` vs `rounded-xl`)
- Condensed typography

#### 13.1.2 Touch Targets
- Minimum 44x44px for all interactive elements
- Adequate spacing between tap targets

### 13.2 Mobile-Specific Features

#### 13.2.1 Bottom Navigation
5 tabs: Home, Transactions, Upload, Analytics, AI Chat

#### 13.2.2 Swipe Actions
- Bi-directional swiping on transaction cards
- Left: Edit, Right: Delete

#### 13.2.3 Long Press
- Initiates multi-selection mode
- Haptic feedback (where supported)

### 13.3 Safe Area Support

```css
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}

.main-content {
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}
```

### 13.4 PWA Configuration

#### 13.4.1 Manifest
```json
{
  "name": "Clear Spends",
  "short_name": "ClearSpends",
  "start_url": "/dashboard",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/pwa-192x192.png", "sizes": "192x192" },
    { "src": "/pwa-512x512.png", "sizes": "512x512" }
  ]
}
```

### 13.5 Capacitor Configuration

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.clearspends.app',
  appName: 'Clear Spends',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};
```

---

## 14. Onboarding Tour

### 14.1 Tour Steps (9 steps)

| Step | Target | Title | Description |
|------|--------|-------|-------------|
| 1 | Dashboard | Welcome | Overview of the app |
| 2 | Stat Cards | Your Stats | Spending overview |
| 3 | Category Chart | Categories | Spending breakdown |
| 4 | Add Transaction Button | Add Expense | Quick entry |
| 5 | Transaction List | Your Transactions | View & manage |
| 6 | Upload Button | Import Data | Bank statement upload |
| 7 | Analytics Nav | Analytics | Deep insights |
| 8 | AI Chat Button | AI Assistant | Natural language |
| 9 | Settings | Customize | Personalization |

### 14.2 Tour Behavior

#### 14.2.1 Highlighting
SVG mask overlay that highlights target element.

#### 14.2.2 Minimization
If user opens a dialog during tour:
1. Tour minimizes to floating pill
2. Dialog action completes
3. Tour resumes and advances

#### 14.2.3 Persistence
Tour completion stored in user context.
Can restart from Settings.

---

## 15. Error Handling

### 15.1 API Errors
- Display user-friendly toast messages
- Log technical details to console
- Retry logic for transient failures

### 15.2 Validation Errors
- Zod schemas for form validation
- Inline error messages
- Prevent submission until valid

### 15.3 Empty States
- Meaningful empty state illustrations
- Call-to-action buttons
- Guidance text

---

## 16. Security Considerations

### 16.1 Authentication
- Supabase Auth with secure token management
- Session persistence
- OAuth redirect loop prevention

### 16.2 Data Isolation
- Row Level Security on all tables
- user_id required on all operations
- No cross-user data access possible

### 16.3 Input Validation
- Zod schemas for all forms
- Sanitization of user input
- XSS prevention

### 16.4 API Security
- Edge functions validate auth tokens
- Rate limiting on AI endpoints
- Secure secret management

---

## Appendix A: File Structure

```
src/
├── components/
│   ├── analytics/
│   │   ├── DayOfWeekChart.tsx
│   │   ├── RecurringExpenses.tsx
│   │   ├── SpendingForecast.tsx
│   │   └── YearOverYearChart.tsx
│   ├── chat/
│   │   ├── AIFloatingButton.tsx
│   │   └── ExpenseAIChat.tsx
│   ├── dashboard/
│   │   ├── AccountSummary.tsx
│   │   ├── CategoryChart.tsx
│   │   ├── RecentTransactions.tsx
│   │   ├── SpendingTrend.tsx
│   │   ├── StatCard.tsx
│   │   └── TagsSpending.tsx
│   ├── layout/
│   │   ├── AnalyticsFilter.tsx
│   │   ├── BottomNav.tsx
│   │   ├── Layout.tsx
│   │   └── Sidebar.tsx
│   ├── onboarding/
│   │   └── OnboardingTour.tsx
│   ├── settings/
│   │   ├── AccountManager.tsx
│   │   ├── CategoryManager.tsx
│   │   ├── ExportTransactions.tsx
│   │   ├── ImportTransactions.tsx
│   │   ├── RecurringExpenseManager.tsx
│   │   └── TagManager.tsx
│   ├── transactions/
│   │   ├── TransactionDialog.tsx
│   │   └── TransactionList.tsx
│   ├── ui/
│   │   └── [shadcn components]
│   └── upload/
│       ├── ClearSpendsImportDialog.tsx
│       ├── FileUpload.tsx
│       ├── TransactionReview.tsx
│       ├── TransactionRowDesktop.tsx
│       └── TransactionRowMobile.tsx
├── context/
│   ├── AnalyticsFilterContext.tsx
│   ├── CurrencyContext.tsx
│   ├── ExpenseContext.tsx
│   ├── OnboardingContext.tsx
│   ├── ThemeContext.tsx
│   └── TransactionDialogContext.tsx
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   ├── useAuth.tsx
│   ├── useExpenseData.tsx
│   ├── useFilteredTransactions.ts
│   └── useRecurringExpenses.tsx
├── pages/
│   ├── settings/
│   │   ├── AccountsSettings.tsx
│   │   ├── CategoriesSettings.tsx
│   │   ├── CurrencySettings.tsx
│   │   ├── DataSettings.tsx
│   │   ├── RecurringExpensesSettings.tsx
│   │   ├── SettingsHub.tsx
│   │   ├── TagsSettings.tsx
│   │   └── ThemeSettings.tsx
│   ├── About.tsx
│   ├── AIChat.tsx
│   ├── Analytics.tsx
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   ├── Install.tsx
│   ├── Landing.tsx
│   ├── NotFound.tsx
│   ├── PrivacyPolicy.tsx
│   ├── TermsOfService.tsx
│   ├── Transactions.tsx
│   └── UploadPage.tsx
├── types/
│   ├── clearspends-export.ts
│   └── expense.ts
├── App.tsx
├── index.css
└── main.tsx

supabase/
├── functions/
│   ├── expense-ai-chat/
│   │   └── index.ts
│   ├── parse-pdf-transactions/
│   │   └── index.ts
│   └── spending-forecast/
│       └── index.ts
└── config.toml
```

---

## Appendix B: API Reference

### Edge Functions

| Function | Method | Auth | Description |
|----------|--------|------|-------------|
| expense-ai-chat | POST | Required | AI chat for expense tracking |
| parse-pdf-transactions | POST | Required | Parse PDF bank statements |
| spending-forecast | POST | Required | Generate spending insights |

---

## Appendix C: Environment Variables

| Variable | Description |
|----------|-------------|
| VITE_SUPABASE_URL | Supabase project URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Supabase anon key |
| LOVABLE_API_KEY | AI gateway API key (edge function) |

---

*End of Specification Document*
