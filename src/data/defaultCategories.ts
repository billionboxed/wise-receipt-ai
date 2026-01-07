// Default categories for new users - simple and essential
export const defaultCategories = [
  // Food
  { main: 'Food', sub: 'Dining', combined: 'Food > Dining' },
  { main: 'Food', sub: 'Groceries', combined: 'Food > Groceries' },
  
  // Bills
  { main: 'Bills', sub: 'Utilities', combined: 'Bills > Utilities' },
  { main: 'Bills', sub: 'Subscriptions', combined: 'Bills > Subscriptions' },
  
  // Transportation
  { main: 'Transportation', sub: 'Fuel', combined: 'Transportation > Fuel' },
  { main: 'Transportation', sub: 'Transit', combined: 'Transportation > Transit' },
  
  // Shopping
  { main: 'Shopping', sub: 'General', combined: 'Shopping > General' },
  
  // Health
  { main: 'Health', sub: 'Medical', combined: 'Health > Medical' },
  
  // Entertainment
  { main: 'Entertainment', sub: 'General', combined: 'Entertainment > General' },
  
  // Travel
  { main: 'Travel', sub: 'General', combined: 'Travel > General' },
  
  // Misc
  { main: 'Misc', sub: 'Other', combined: 'Misc > Other' },
];

export const defaultAccounts = [
  { name: 'Cash', type: 'cash' as const },
  { name: 'Bank Account', type: 'bank' as const },
  { name: 'Credit Card', type: 'credit' as const },
];
