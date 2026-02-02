

## Date Period Filter for Analytics (Without Custom Date Picker)

### Overview
Implement a simple dropdown-based period selector for filtering analytics data by common time periods. No custom calendar picker - just quick presets.

### UI Design

```text
+---------------------------------------------------------------+
|  Analytics                                                     |
|  Deep insights into your spending patterns                     |
|                                                                 |
|  [This Month ▼]                        [Regular] [All] [Projects]|
+---------------------------------------------------------------+
```

### Implementation Steps

#### 1. Create DateRangeContext (`src/context/DateRangeContext.tsx`)

Global state management for the selected date period:

- **State**: `preset` (string) - stores the selected period
- **Presets available**:
  - This Month
  - Last Month  
  - Last 3 Months
  - Last 6 Months
  - This Year
  - Last Year
  - All Time (default)
- **Helper function**: `getDateRange()` - returns calculated `startDate` and `endDate` based on preset
- **Persistence**: Save to localStorage so selection persists across sessions

#### 2. Create DatePeriodPicker Component (`src/components/layout/DatePeriodPicker.tsx`)

Simple dropdown selector:

- Uses existing `Select` component from UI library
- Shows current period selection
- Compact design that works on mobile
- Positioned next to the existing Analytics Filter

#### 3. Update useFilteredTransactions Hook (`src/hooks/useFilteredTransactions.ts`)

Add date filtering logic:

- Import the date range context
- After applying project/regular filter, also filter by date range
- Use `date-fns` for date comparisons (`isWithinInterval`, `parseISO`)
- Skip date filtering when "All Time" is selected

#### 4. Update Layout Component (`src/components/layout/Layout.tsx`)

- Add DatePeriodPicker next to existing AnalyticsFilter
- Only show on Dashboard and Analytics pages (same condition as AnalyticsFilter)
- Wrap both pickers in a flex container for proper alignment

#### 5. Wrap App with DateRangeProvider (`src/App.tsx`)

- Add the new context provider to the app's provider hierarchy

### Files to Create

| File | Purpose |
|------|---------|
| `src/context/DateRangeContext.tsx` | Date period state management |
| `src/components/layout/DatePeriodPicker.tsx` | Dropdown UI component |

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useFilteredTransactions.ts` | Add date range filtering |
| `src/components/layout/Layout.tsx` | Add picker to header |
| `src/App.tsx` | Add DateRangeProvider |

### Technical Notes

- All date calculations use `date-fns` (already installed)
- Preset calculations happen at render time using functions like `startOfMonth()`, `subMonths()`, etc.
- "All Time" returns null dates which skips date filtering entirely
- Charts that have hardcoded time windows (like "Last 30 Days" or "8 weeks") will now respect the global filter instead
- Mobile: Dropdown will be full-width on small screens for easy touch interaction

