import { Category } from '@/hooks/useExpenseData';

// Comprehensive keyword rules for smart categorization
// Priority order matters - more specific matches come first
const categoryRules: Array<{
  keywords: string[];
  categoryMain: string;
  categorySub?: string;
  priority: number;
}> = [
  // ============ FOOD & DINING ============
  // Delivery apps (high priority, specific)
  { keywords: ['zomato', 'swiggy', 'uber eats', 'doordash', 'skip the dishes', 'grubhub', 'instacart', 'deliveroo', 'postmates', 'just eat', 'foodpanda'], categoryMain: 'Food', categorySub: 'Delivery', priority: 10 },
  
  // Coffee & Snacks (specific chains)
  { keywords: ['starbucks', 'tim hortons', 'dunkin', 'costa coffee', 'cafe coffee day', 'second cup', 'blue bottle', 'chaayos', 'caribou coffee'], categoryMain: 'Food', categorySub: 'Snacks & Coffee', priority: 9 },
  
  // Fast Food chains
  { keywords: ['mcdonald', 'burger king', 'wendy', 'kfc', 'taco bell', 'chipotle', 'subway', 'panda express', 'five guys', 'chick-fil-a', 'popeyes', 'arby', 'jack in the box', "carl's jr", 'sonic drive', 'whataburger', 'in-n-out'], categoryMain: 'Food', categorySub: 'Dining Out', priority: 8 },
  
  // Restaurants (generic)
  { keywords: ['restaurant', 'cafe', 'bistro', 'diner', 'grill', 'kitchen', 'eatery', 'pizzeria', 'sushi', 'thai', 'indian restaurant', 'chinese restaurant', 'italian restaurant', 'mexican restaurant'], categoryMain: 'Food', categorySub: 'Dining Out', priority: 7 },
  
  // Pizza chains
  { keywords: ["domino's", 'pizza hut', 'papa john', 'little caesar', 'papa murphy'], categoryMain: 'Food', categorySub: 'Delivery', priority: 8 },
  
  // ============ GROCERIES ============
  // India
  { keywords: ['big bazaar', 'dmart', 'd-mart', 'reliance fresh', 'reliance smart', 'more megastore', 'spencer', 'nature basket', 'star bazaar', 'easyday', 'grofers', 'bigbasket', 'blinkit', 'zepto', 'jiomart'], categoryMain: 'Household', categorySub: 'Groceries', priority: 9 },
  
  // USA
  { keywords: ['walmart', 'costco', 'target', 'whole foods', 'trader joe', 'kroger', 'safeway', 'publix', 'aldi', 'food lion', 'wegmans', 'sprouts', 'h-e-b', 'meijer', 'albertsons', 'winn-dixie', 'food 4 less', 'piggly wiggly', 'shoprite', 'stop & shop', 'giant eagle', 'harris teeter', 'fred meyer', 'vons', 'ralphs', 'food bazaar', 'food city'], categoryMain: 'Household', categorySub: 'Groceries', priority: 9 },
  
  // Canada
  { keywords: ['loblaws', 'sobeys', 'metro', 'no frills', 'superstore', 'real canadian superstore', 'freshco', 'food basics', 'zehrs', 'farm boy', 'longos', 'independent grocer', 'voila', 'save-on-foods'], categoryMain: 'Household', categorySub: 'Groceries', priority: 9 },
  
  // UK
  { keywords: ['tesco', 'sainsbury', 'asda', 'morrisons', 'waitrose', 'lidl uk', 'aldi uk', 'co-op food', 'marks & spencer food', 'm&s food', 'ocado', 'iceland'], categoryMain: 'Household', categorySub: 'Groceries', priority: 9 },
  
  // Australia
  { keywords: ['coles', 'woolworths', 'iga', 'aldi australia', 'harris farm', 'foodworks'], categoryMain: 'Household', categorySub: 'Groceries', priority: 9 },
  
  // Generic grocery keywords
  { keywords: ['grocery', 'supermarket', 'provisions', 'kirana', 'market', 'fresh produce'], categoryMain: 'Household', categorySub: 'Groceries', priority: 6 },
  
  // ============ FUEL & GAS ============
  // Fuel stations
  { keywords: ['shell', 'esso', 'petro-canada', 'chevron', 'bp', 'exxon', 'mobil', 'sunoco', 'marathon', 'phillips 66', 'valero', 'casey', 'speedway', 'circle k', 'wawa', 'sheetz', 'quiktrip', 'racetrac', 'loves travel', 'pilot flying j', 'ta petro'], categoryMain: 'Transportation', categorySub: 'Fuel', priority: 9 },
  
  // India fuel
  { keywords: ['hp petrol', 'indian oil', 'bharat petroleum', 'iocl', 'bpcl', 'hpcl', 'essar', 'reliance petrol', 'nayara'], categoryMain: 'Transportation', categorySub: 'Fuel', priority: 9 },
  
  // Generic fuel
  { keywords: ['fuel', 'petrol', 'diesel', 'gas station', 'filling station', 'petroleum'], categoryMain: 'Transportation', categorySub: 'Fuel', priority: 7 },
  
  // ============ RIDE SHARE & TRANSIT ============
  { keywords: ['uber', 'lyft', 'ola', 'ola cabs', 'rapido', 'grab', 'didi', 'gojek', 'bolt'], categoryMain: 'Transportation', categorySub: 'Ride Share', priority: 9 },
  { keywords: ['taxi', 'cab', 'auto rickshaw', 'rickshaw'], categoryMain: 'Transportation', categorySub: 'Ride Share', priority: 7 },
  { keywords: ['metro', 'subway', 'bus', 'transit', 'rail', 'train', 'presto', 'compass card', 'mta', 'ttc', 'oyster', 'clipper', 'ventra', 'septa', 'bart', 'cta', 'path', 'dmrc', 'bmrc'], categoryMain: 'Transportation', categorySub: 'Public Transit', priority: 8 },
  { keywords: ['parking', 'parkade', 'valet', 'meter', 'parkwhiz', 'spothero', 'parkopedia'], categoryMain: 'Transportation', categorySub: 'Parking', priority: 8 },
  
  // ============ SUBSCRIPTIONS & STREAMING ============
  // Streaming
  { keywords: ['netflix', 'disney+', 'disney plus', 'hulu', 'hbo max', 'amazon prime video', 'paramount+', 'peacock', 'apple tv+', 'crave', 'hotstar', 'sony liv', 'zee5', 'voot', 'discovery+', 'britbox', 'mubi'], categoryMain: 'Subscriptions', categorySub: 'Streaming', priority: 10 },
  
  // Music streaming
  { keywords: ['spotify', 'apple music', 'youtube music', 'youtube premium', 'amazon music', 'tidal', 'deezer', 'pandora', 'soundcloud', 'audible', 'gaana', 'jiosaavn', 'wynk'], categoryMain: 'Subscriptions', categorySub: 'Streaming', priority: 10 },
  
  // Software & Apps
  { keywords: ['adobe', 'microsoft 365', 'office 365', 'dropbox', 'google one', 'icloud', 'notion', 'slack', 'zoom', 'evernote', 'lastpass', '1password', 'canva', 'figma', 'github', 'grammarly', 'nordvpn', 'expressvpn', 'surfshark'], categoryMain: 'Subscriptions', categorySub: 'Software & Apps', priority: 10 },
  
  // Memberships
  { keywords: ['amazon prime', 'costco membership', 'sam\'s club', 'bj\'s wholesale', 'gym membership', 'fitness membership', 'club membership'], categoryMain: 'Subscriptions', categorySub: 'Memberships', priority: 9 },
  
  // Generic subscription
  { keywords: ['subscription', 'monthly plan', 'annual plan', 'renewal', 'membership fee'], categoryMain: 'Subscriptions', categorySub: 'Streaming', priority: 5 },
  
  // ============ ENTERTAINMENT ============
  // Movies & Shows
  { keywords: ['pvr', 'inox', 'cinepolis', 'amc theatres', 'regal cinemas', 'cinemark', 'cineplex', 'vue cinema', 'odeon', 'showcase', 'movie ticket', 'imax'], categoryMain: 'Entertainment', categorySub: 'Movies & Shows', priority: 9 },
  
  // Gaming
  { keywords: ['playstation', 'xbox', 'nintendo', 'steam', 'epic games', 'ea sports', 'activision', 'ubisoft', 'riot games', 'game pass'], categoryMain: 'Entertainment', categorySub: 'Games', priority: 9 },
  
  // Generic entertainment
  { keywords: ['movie', 'cinema', 'theatre', 'theater', 'concert', 'show', 'amusement', 'theme park', 'arcade'], categoryMain: 'Entertainment', categorySub: 'Movies & Shows', priority: 6 },
  
  // ============ SHOPPING ============
  // Apparel
  { keywords: ['zara', 'h&m', 'uniqlo', 'gap', 'old navy', 'banana republic', 'forever 21', 'asos', 'shein', 'nike', 'adidas', 'puma', 'reebok', 'under armour', 'lululemon', 'athleta', 'nordstrom', 'macy\'s', 'kohl\'s', 'tj maxx', 'ross', 'marshall', 'burlington', 'fabindia', 'westside', 'max fashion', 'pantaloons', 'lifestyle', 'shoppers stop', 'central'], categoryMain: 'Shopping', categorySub: 'Apparel', priority: 9 },
  
  // Electronics
  { keywords: ['best buy', 'apple store', 'samsung store', 'micro center', 'newegg', 'b&h photo', 'croma', 'reliance digital', 'vijay sales', 'curry\'s', 'currys pc world', 'jb hi-fi'], categoryMain: 'Shopping', categorySub: 'Electronics', priority: 9 },
  
  // Home & Garden
  { keywords: ['home depot', 'lowe\'s', 'ikea', 'wayfair', 'bed bath', 'pottery barn', 'crate & barrel', 'williams sonoma', 'pier 1', 'world market', 'at home', 'home goods', 'ace hardware', 'menards', 'true value', 'urban ladder', 'pepperfry', 'hometown'], categoryMain: 'Shopping', categorySub: 'Home & Garden', priority: 9 },
  
  // Online marketplaces
  { keywords: ['amazon', 'ebay', 'etsy', 'alibaba', 'aliexpress', 'wish', 'flipkart', 'myntra', 'ajio', 'nykaa', 'snapdeal', 'meesho', 'jiomart', 'tatacliq'], categoryMain: 'Shopping', categorySub: 'Online Shopping', priority: 8 },
  
  // Generic shopping
  { keywords: ['clothes', 'apparel', 'fashion', 'footwear', 'shoes', 'accessories', 'jewelry', 'watch'], categoryMain: 'Shopping', categorySub: 'Apparel', priority: 5 },
  
  // ============ HEALTH ============
  // Pharmacy chains
  { keywords: ['cvs', 'walgreens', 'rite aid', 'shoppers drug mart', 'rexall', 'pharmaprix', 'london drugs', 'boots', 'lloyds pharmacy', 'superdrug', 'apollo pharmacy', 'medplus', 'netmeds', 'pharmeasy', '1mg'], categoryMain: 'Health', categorySub: 'Pharmacy', priority: 9 },
  
  // Fitness
  { keywords: ['gym', 'fitness', 'yoga', 'pilates', 'crossfit', 'planet fitness', 'anytime fitness', 'gold\'s gym', 'equinox', 'la fitness', 'lifetime fitness', 'orangetheory', 'f45', 'cult.fit', 'cultfit'], categoryMain: 'Health', categorySub: 'Fitness', priority: 9 },
  
  // Personal care
  { keywords: ['sephora', 'ulta', 'bath & body works', 'lush', 'the body shop', 'mac cosmetics', 'salon', 'spa', 'massage', 'haircut', 'barber', 'beauty'], categoryMain: 'Health', categorySub: 'Personal Care', priority: 8 },
  
  // Medical
  { keywords: ['doctor', 'hospital', 'clinic', 'medical', 'healthcare', 'diagnostic', 'laboratory', 'lab test', 'x-ray', 'mri', 'ct scan', 'dental', 'dentist', 'optician', 'eye care', 'vision', 'dr.', 'apollo hospital', 'fortis', 'max hospital', 'medanta', 'practo'], categoryMain: 'Health', categorySub: 'Medical', priority: 8 },
  
  // Generic health
  { keywords: ['pharmacy', 'medicine', 'prescription', 'drug store', 'chemist', 'health'], categoryMain: 'Health', categorySub: 'Pharmacy', priority: 5 },
  
  // ============ UTILITIES & BILLS ============
  // Telecom
  { keywords: ['at&t', 'verizon', 'comcast', 'xfinity', 'spectrum', 't-mobile', 'sprint', 'rogers', 'bell', 'telus', 'shaw', 'fido', 'koodo', 'virgin mobile', 'freedom mobile', 'ee', 'vodafone', 'o2', 'three', 'jio', 'airtel', 'vi', 'bsnl'], categoryMain: 'Household', categorySub: 'Bills & Utilities', priority: 9 },
  
  // Utilities
  { keywords: ['electricity', 'hydro', 'electric bill', 'power bill', 'water bill', 'gas bill', 'utility', 'enbridge', 'pge', 'con edison', 'duke energy', 'southern company', 'national grid'], categoryMain: 'Household', categorySub: 'Bills & Utilities', priority: 8 },
  
  // Internet
  { keywords: ['internet', 'broadband', 'wifi', 'fiber', 'dsl', 'cable', 'hathway', 'act fibernet', 'excitel'], categoryMain: 'Household', categorySub: 'Bills & Utilities', priority: 7 },
  
  // ============ TRAVEL ============
  // Airlines
  { keywords: ['air canada', 'westjet', 'american airlines', 'delta', 'united airlines', 'southwest', 'jetblue', 'alaska airlines', 'spirit', 'frontier', 'british airways', 'lufthansa', 'emirates', 'qatar airways', 'singapore airlines', 'cathay pacific', 'air india', 'indigo', 'spicejet', 'go air', 'vistara', 'air asia'], categoryMain: 'Travel', categorySub: 'Flights', priority: 10 },
  
  // Hotels
  { keywords: ['marriott', 'hilton', 'ihg', 'hyatt', 'wyndham', 'best western', 'radisson', 'sheraton', 'westin', 'holiday inn', 'doubletree', 'hampton inn', 'courtyard', 'fairfield inn', 'comfort inn', 'la quinta', 'motel 6', 'super 8', 'days inn', 'taj hotels', 'oberoi', 'itc hotels', 'lemon tree', 'oyo', 'treebo', 'fabhotels'], categoryMain: 'Travel', categorySub: 'Hotels', priority: 10 },
  
  // Booking platforms
  { keywords: ['airbnb', 'vrbo', 'booking.com', 'expedia', 'hotels.com', 'kayak', 'trivago', 'priceline', 'hotwire', 'orbitz', 'makemytrip', 'goibibo', 'cleartrip', 'ixigo', 'yatra'], categoryMain: 'Travel', categorySub: 'Hotels', priority: 9 },
  
  // Generic travel
  { keywords: ['flight', 'airline', 'airport', 'travel', 'vacation', 'trip', 'holiday', 'cruise', 'resort'], categoryMain: 'Travel', categorySub: 'Flights', priority: 6 },
  { keywords: ['hotel', 'motel', 'lodge', 'inn', 'hostel', 'accommodation', 'stay'], categoryMain: 'Travel', categorySub: 'Hotels', priority: 6 },
  
  // ============ EDUCATION ============
  { keywords: ['tuition', 'university', 'college', 'school fee', 'education fee', 'semester'], categoryMain: 'Education', categorySub: 'Tuition', priority: 9 },
  { keywords: ['udemy', 'coursera', 'skillshare', 'masterclass', 'linkedin learning', 'pluralsight', 'codecademy', 'datacamp', 'edx', 'khan academy', 'unacademy', 'byju', 'vedantu', 'upgrad'], categoryMain: 'Education', categorySub: 'Courses', priority: 9 },
  { keywords: ['book', 'textbook', 'stationery', 'notebook', 'supplies', 'amazon kindle'], categoryMain: 'Education', categorySub: 'Books & Supplies', priority: 7 },
  { keywords: ['school', 'course', 'class', 'lesson', 'tutorial', 'training', 'workshop', 'seminar'], categoryMain: 'Education', categorySub: 'Courses', priority: 5 },
  
  // ============ INSURANCE ============
  { keywords: ['health insurance', 'medical insurance', 'life insurance', 'term insurance', 'lic', 'hdfc life', 'icici prudential', 'max life', 'sbi life', 'bajaj allianz', 'star health', 'care health'], categoryMain: 'Insurance', categorySub: 'Health Insurance', priority: 9 },
  { keywords: ['car insurance', 'auto insurance', 'vehicle insurance', 'motor insurance', 'geico', 'progressive', 'state farm', 'allstate', 'liberty mutual', 'nationwide', 'farmers'], categoryMain: 'Insurance', categorySub: 'Vehicle Insurance', priority: 9 },
  { keywords: ['insurance', 'premium', 'policy', 'coverage'], categoryMain: 'Insurance', categorySub: 'Health Insurance', priority: 5 },
  
  // ============ SOCIAL ============
  { keywords: ['gift', 'present', 'birthday', 'anniversary', 'wedding gift', 'baby shower', 'hallmark', 'archies'], categoryMain: 'Social Life', categorySub: 'Gifts', priority: 8 },
  { keywords: ['donation', 'charity', 'ngo', 'fundraiser', 'gofundme', 'ketto', 'milaap'], categoryMain: 'Social Life', categorySub: 'Donations', priority: 9 },
  { keywords: ['party', 'event', 'celebration', 'wedding', 'reception', 'banquet', 'catering'], categoryMain: 'Social Life', categorySub: 'Events & Parties', priority: 7 },
  
  // ============ ATM & CASH ============
  { keywords: ['atm', 'cash withdrawal', 'atm withdrawal', 'cash deposit', 'cash advance'], categoryMain: 'Misc', categorySub: 'ATM & Cash', priority: 9 },
  
  // ============ FEES & CHARGES ============
  { keywords: ['fee', 'charge', 'penalty', 'fine', 'overdraft', 'late fee', 'interest charge', 'annual fee', 'service charge', 'convenience fee', 'processing fee', 'transaction fee'], categoryMain: 'Misc', categorySub: 'Fees & Charges', priority: 8 },
  
  // ============ VEHICLE MAINTENANCE ============
  { keywords: ['car wash', 'auto repair', 'mechanic', 'tire', 'oil change', 'service center', 'car service', 'bike service', 'vehicle service', 'brake', 'alignment', 'battery', 'midas', 'jiffy lube', 'firestone', 'goodyear', 'pep boys', 'autozone', 'o\'reilly auto'], categoryMain: 'Transportation', categorySub: 'Maintenance', priority: 8 },
];

/**
 * Smart category matcher that finds the best matching category based on transaction description
 * Uses priority-based matching and subcategory awareness
 */
export function findBestCategory(
  description: string,
  categories: Category[]
): { categoryId: string | undefined; confidence: 'high' | 'medium' | 'low' } {
  const lowerDesc = description.toLowerCase();
  
  // Find all matching rules
  const matches: Array<{ rule: typeof categoryRules[0]; matchedKeyword: string }> = [];
  
  for (const rule of categoryRules) {
    for (const keyword of rule.keywords) {
      if (lowerDesc.includes(keyword)) {
        matches.push({ rule, matchedKeyword: keyword });
        break; // Only match first keyword per rule
      }
    }
  }
  
  if (matches.length === 0) {
    // Fallback to Misc
    const miscCategory = categories.find(c => c.main === 'Misc');
    return { categoryId: miscCategory?.id || categories[0]?.id, confidence: 'low' };
  }
  
  // Sort by priority (highest first) and keyword length (longer = more specific)
  matches.sort((a, b) => {
    if (b.rule.priority !== a.rule.priority) {
      return b.rule.priority - a.rule.priority;
    }
    return b.matchedKeyword.length - a.matchedKeyword.length;
  });
  
  const bestMatch = matches[0];
  
  // Try to find exact subcategory match first
  if (bestMatch.rule.categorySub) {
    const exactMatch = categories.find(
      c => c.main.toLowerCase() === bestMatch.rule.categoryMain.toLowerCase() &&
           c.sub.toLowerCase() === bestMatch.rule.categorySub!.toLowerCase()
    );
    if (exactMatch) {
      return { categoryId: exactMatch.id, confidence: bestMatch.rule.priority >= 8 ? 'high' : 'medium' };
    }
  }
  
  // Fallback to main category match
  const mainMatch = categories.find(
    c => c.main.toLowerCase() === bestMatch.rule.categoryMain.toLowerCase()
  );
  
  if (mainMatch) {
    return { categoryId: mainMatch.id, confidence: bestMatch.rule.priority >= 7 ? 'medium' : 'low' };
  }
  
  // Fallback to Misc
  const miscCategory = categories.find(c => c.main === 'Misc');
  return { categoryId: miscCategory?.id || categories[0]?.id, confidence: 'low' };
}

/**
 * Find category ID by main category name (case-insensitive)
 */
export function findCategoryByMain(
  categoryMain: string,
  categories: Category[]
): string | undefined {
  // Direct match
  let category = categories.find(c => c.main.toLowerCase() === categoryMain.toLowerCase());
  if (category) return category.id;
  
  // Handle common aliases
  const aliases: Record<string, string[]> = {
    'household': ['groceries', 'home', 'utilities', 'bills'],
    'transportation': ['transport', 'commute', 'travel', 'fuel'],
    'food': ['dining', 'restaurant', 'eat', 'meals'],
    'shopping': ['apparel', 'clothing', 'electronics'],
    'health': ['medical', 'healthcare', 'wellness', 'fitness'],
    'entertainment': ['fun', 'leisure', 'recreation'],
    'subscriptions': ['subscription', 'recurring', 'streaming'],
    'misc': ['miscellaneous', 'other', 'uncategorized'],
    'travel': ['vacation', 'trip', 'holiday'],
  };
  
  const lowerMain = categoryMain.toLowerCase();
  
  for (const [main, aliasList] of Object.entries(aliases)) {
    if (aliasList.some(alias => lowerMain.includes(alias) || alias.includes(lowerMain))) {
      category = categories.find(c => c.main.toLowerCase() === main);
      if (category) return category.id;
    }
  }
  
  // Fallback to Misc
  const miscCategory = categories.find(c => c.main === 'Misc');
  return miscCategory?.id || categories[0]?.id;
}
