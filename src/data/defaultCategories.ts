// Default categories for new users - comprehensive and universal
export const defaultCategories = [
  // Food & Dining
  { main: 'Food', sub: 'Dining Out', combined: 'Food > Dining Out' },
  { main: 'Food', sub: 'Delivery', combined: 'Food > Delivery' },
  { main: 'Food', sub: 'Snacks & Coffee', combined: 'Food > Snacks & Coffee' },
  
  // Household
  { main: 'Household', sub: 'Groceries', combined: 'Household > Groceries' },
  { main: 'Household', sub: 'Bills & Utilities', combined: 'Household > Bills & Utilities' },
  { main: 'Household', sub: 'Appliances', combined: 'Household > Appliances' },
  { main: 'Household', sub: 'Maintenance', combined: 'Household > Maintenance' },
  
  // Transportation
  { main: 'Transportation', sub: 'Fuel', combined: 'Transportation > Fuel' },
  { main: 'Transportation', sub: 'Public Transit', combined: 'Transportation > Public Transit' },
  { main: 'Transportation', sub: 'Ride Share', combined: 'Transportation > Ride Share' },
  { main: 'Transportation', sub: 'Maintenance', combined: 'Transportation > Maintenance' },
  { main: 'Transportation', sub: 'Parking', combined: 'Transportation > Parking' },
  
  // Shopping
  { main: 'Shopping', sub: 'Apparel', combined: 'Shopping > Apparel' },
  { main: 'Shopping', sub: 'Electronics', combined: 'Shopping > Electronics' },
  { main: 'Shopping', sub: 'Home & Garden', combined: 'Shopping > Home & Garden' },
  { main: 'Shopping', sub: 'Online Shopping', combined: 'Shopping > Online Shopping' },
  
  // Health & Wellness
  { main: 'Health', sub: 'Medical', combined: 'Health > Medical' },
  { main: 'Health', sub: 'Pharmacy', combined: 'Health > Pharmacy' },
  { main: 'Health', sub: 'Fitness', combined: 'Health > Fitness' },
  { main: 'Health', sub: 'Personal Care', combined: 'Health > Personal Care' },
  
  // Entertainment
  { main: 'Entertainment', sub: 'Movies & Shows', combined: 'Entertainment > Movies & Shows' },
  { main: 'Entertainment', sub: 'Games', combined: 'Entertainment > Games' },
  { main: 'Entertainment', sub: 'Sports & Recreation', combined: 'Entertainment > Sports & Recreation' },
  
  // Subscriptions
  { main: 'Subscriptions', sub: 'Streaming', combined: 'Subscriptions > Streaming' },
  { main: 'Subscriptions', sub: 'Software & Apps', combined: 'Subscriptions > Software & Apps' },
  { main: 'Subscriptions', sub: 'Memberships', combined: 'Subscriptions > Memberships' },
  
  // Social
  { main: 'Social Life', sub: 'Gifts', combined: 'Social Life > Gifts' },
  { main: 'Social Life', sub: 'Events & Parties', combined: 'Social Life > Events & Parties' },
  { main: 'Social Life', sub: 'Donations', combined: 'Social Life > Donations' },
  
  // Education
  { main: 'Education', sub: 'Tuition', combined: 'Education > Tuition' },
  { main: 'Education', sub: 'Books & Supplies', combined: 'Education > Books & Supplies' },
  { main: 'Education', sub: 'Courses', combined: 'Education > Courses' },
  
  // Travel
  { main: 'Travel', sub: 'Flights', combined: 'Travel > Flights' },
  { main: 'Travel', sub: 'Hotels', combined: 'Travel > Hotels' },
  { main: 'Travel', sub: 'Vacation Activities', combined: 'Travel > Vacation Activities' },
  
  // Insurance & Finance
  { main: 'Insurance', sub: 'Health Insurance', combined: 'Insurance > Health Insurance' },
  { main: 'Insurance', sub: 'Vehicle Insurance', combined: 'Insurance > Vehicle Insurance' },
  { main: 'Insurance', sub: 'Life Insurance', combined: 'Insurance > Life Insurance' },
  
  // Misc
  { main: 'Misc', sub: 'Uncategorized', combined: 'Misc > Uncategorized' },
  { main: 'Misc', sub: 'ATM & Cash', combined: 'Misc > ATM & Cash' },
  { main: 'Misc', sub: 'Fees & Charges', combined: 'Misc > Fees & Charges' },
];

export const defaultAccounts = [
  { name: 'Cash', type: 'cash' as const },
  { name: 'Bank Account', type: 'bank' as const },
  { name: 'Credit Card', type: 'credit' as const },
];
