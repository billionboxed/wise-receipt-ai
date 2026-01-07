// Default categories for new users - industry standard
export const defaultCategories = [
  // Household
  { main: 'Household', sub: 'Groceries', combined: 'Household > Groceries' },
  { main: 'Household', sub: 'Utilities', combined: 'Household > Utilities' },
  { main: 'Household', sub: 'Rent/Mortgage', combined: 'Household > Rent/Mortgage' },
  
  // Food & Dining
  { main: 'Food & Dining', sub: 'Restaurants', combined: 'Food & Dining > Restaurants' },
  { main: 'Food & Dining', sub: 'Coffee & Snacks', combined: 'Food & Dining > Coffee & Snacks' },
  
  // Transportation
  { main: 'Transportation', sub: 'Fuel', combined: 'Transportation > Fuel' },
  { main: 'Transportation', sub: 'Public Transit', combined: 'Transportation > Public Transit' },
  { main: 'Transportation', sub: 'Parking', combined: 'Transportation > Parking' },
  
  // Shopping
  { main: 'Shopping', sub: 'Clothing', combined: 'Shopping > Clothing' },
  { main: 'Shopping', sub: 'Electronics', combined: 'Shopping > Electronics' },
  { main: 'Shopping', sub: 'General', combined: 'Shopping > General' },
  
  // Bills & Subscriptions
  { main: 'Bills', sub: 'Phone & Internet', combined: 'Bills > Phone & Internet' },
  { main: 'Bills', sub: 'Insurance', combined: 'Bills > Insurance' },
  { main: 'Bills', sub: 'Subscriptions', combined: 'Bills > Subscriptions' },
  
  // Health & Wellness
  { main: 'Health', sub: 'Medical', combined: 'Health > Medical' },
  { main: 'Health', sub: 'Pharmacy', combined: 'Health > Pharmacy' },
  
  // Entertainment
  { main: 'Entertainment', sub: 'Movies & Events', combined: 'Entertainment > Movies & Events' },
  { main: 'Entertainment', sub: 'Hobbies', combined: 'Entertainment > Hobbies' },
  
  // Travel
  { main: 'Travel', sub: 'Accommodation', combined: 'Travel > Accommodation' },
  { main: 'Travel', sub: 'Transport', combined: 'Travel > Transport' },
  
  // Personal
  { main: 'Personal', sub: 'Gifts', combined: 'Personal > Gifts' },
  { main: 'Personal', sub: 'Education', combined: 'Personal > Education' },
  
  // Miscellaneous
  { main: 'Miscellaneous', sub: 'Other', combined: 'Miscellaneous > Other' },
  { main: 'Miscellaneous', sub: 'Fees & Charges', combined: 'Miscellaneous > Fees & Charges' },
];

export const defaultAccounts = [
  { name: 'Cash', type: 'cash' as const },
  { name: 'Bank Account', type: 'bank' as const },
  { name: 'Credit Card', type: 'credit' as const },
];
