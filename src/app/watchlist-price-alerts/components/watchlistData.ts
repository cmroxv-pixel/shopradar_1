export interface WatchlistItem {
  id: string;
  productName: string;
  model: string;
  color: string;
  imageUrl: string;
  currentBestPrice: number;
  currency: string;
  originalPrice: number;
  marketplaceCount: number;
  bestMarketplace: string;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  addedAt: string;
  lastChecked: string;
  hasAlert: boolean;
  priceHistory: {date: string;price: number;}[];
}

export interface PriceAlert {
  id: string;
  productName: string;
  model: string;
  color: string;
  imageUrl: string;
  targetPrice: number;
  currentPrice: number;
  currency: string;
  originalPrice: number;
  marketplace: string;
  status: 'Active' | 'Triggered' | 'Paused';
  emailEnabled: boolean;
  createdAt: string;
  lastTriggered?: string;
  priceHistory: {date: string;price: number;}[];
  priceDrop: number;
}

export const mockWatchlist: WatchlistItem[] = [
{
  id: 'wl-001',
  productName: 'Sony WH-1000XM5',
  model: 'WH-1000XM5',
  color: 'Black',
  imageUrl: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=200&h=200&fit=crop',
  currentBestPrice: 261.89,
  currency: 'USD',
  originalPrice: 349.99,
  marketplaceCount: 11,
  bestMarketplace: 'Rakuten',
  stockStatus: 'In Stock',
  addedAt: 'Apr 1, 2026',
  lastChecked: '2 min ago',
  hasAlert: true,
  priceHistory: [
  { date: 'Mar 9', price: 349.99 },
  { date: 'Mar 16', price: 319.99 },
  { date: 'Mar 23', price: 295.00 },
  { date: 'Mar 30', price: 275.00 },
  { date: 'Apr 6', price: 261.89 }]

},
{
  id: 'wl-002',
  productName: 'Apple AirPods Pro 2',
  model: 'MTJV3LL/A',
  color: 'White',
  imageUrl: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=200&h=200&fit=crop',
  currentBestPrice: 189.99,
  currency: 'USD',
  originalPrice: 249.00,
  marketplaceCount: 8,
  bestMarketplace: 'Amazon',
  stockStatus: 'In Stock',
  addedAt: 'Mar 28, 2026',
  lastChecked: '5 min ago',
  hasAlert: false,
  priceHistory: [
  { date: 'Mar 9', price: 249.00 },
  { date: 'Mar 16', price: 229.00 },
  { date: 'Mar 23', price: 219.00 },
  { date: 'Mar 30', price: 199.99 },
  { date: 'Apr 6', price: 189.99 }]

},
{
  id: 'wl-003',
  productName: 'Samsung Galaxy S25 Ultra',
  model: 'SM-S938B',
  color: 'Titanium Gray',
  imageUrl: 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=200&h=200&fit=crop',
  currentBestPrice: 1099.99,
  currency: 'USD',
  originalPrice: 1299.99,
  marketplaceCount: 6,
  bestMarketplace: 'Best Buy',
  stockStatus: 'Low Stock',
  addedAt: 'Mar 25, 2026',
  lastChecked: '12 min ago',
  hasAlert: true,
  priceHistory: [
  { date: 'Mar 9', price: 1299.99 },
  { date: 'Mar 16', price: 1249.99 },
  { date: 'Mar 23', price: 1199.99 },
  { date: 'Mar 30', price: 1149.99 },
  { date: 'Apr 6', price: 1099.99 }]

},
{
  id: 'wl-004',
  productName: 'Dyson V15 Detect',
  model: 'V15-DETECT',
  color: 'Yellow/Nickel',
  imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
  currentBestPrice: 499.99,
  currency: 'USD',
  originalPrice: 749.99,
  marketplaceCount: 5,
  bestMarketplace: 'Walmart',
  stockStatus: 'In Stock',
  addedAt: 'Mar 20, 2026',
  lastChecked: '1 hr ago',
  hasAlert: false,
  priceHistory: [
  { date: 'Mar 9', price: 749.99 },
  { date: 'Mar 16', price: 699.99 },
  { date: 'Mar 23', price: 599.99 },
  { date: 'Mar 30', price: 549.99 },
  { date: 'Apr 6', price: 499.99 }]

},
{
  id: 'wl-005',
  productName: 'Lego Technic Bugatti Chiron',
  model: '42083',
  color: 'Blue/Black',
  imageUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_180331b29-1773516268051.png",
  currentBestPrice: 279.99,
  currency: 'USD',
  originalPrice: 379.99,
  marketplaceCount: 4,
  bestMarketplace: 'eBay',
  stockStatus: 'Out of Stock',
  addedAt: 'Mar 15, 2026',
  lastChecked: '3 hr ago',
  hasAlert: false,
  priceHistory: [
  { date: 'Mar 9', price: 379.99 },
  { date: 'Mar 16', price: 359.99 },
  { date: 'Mar 23', price: 329.99 },
  { date: 'Mar 30', price: 299.99 },
  { date: 'Apr 6', price: 279.99 }]

},
{
  id: 'wl-006',
  productName: 'Nintendo Switch OLED',
  model: 'HEG-001',
  color: 'White',
  imageUrl: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=200&h=200&fit=crop',
  currentBestPrice: 299.99,
  currency: 'USD',
  originalPrice: 349.99,
  marketplaceCount: 9,
  bestMarketplace: 'Costco',
  stockStatus: 'In Stock',
  addedAt: 'Mar 10, 2026',
  lastChecked: '30 min ago',
  hasAlert: true,
  priceHistory: [
  { date: 'Mar 9', price: 349.99 },
  { date: 'Mar 16', price: 339.99 },
  { date: 'Mar 23', price: 319.99 },
  { date: 'Mar 30', price: 309.99 },
  { date: 'Apr 6', price: 299.99 }]

},
{
  id: 'wl-007',
  productName: 'Bose QuietComfort 45',
  model: 'QC45',
  color: 'Triple Black',
  imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
  currentBestPrice: 229.00,
  currency: 'USD',
  originalPrice: 329.00,
  marketplaceCount: 7,
  bestMarketplace: 'B&H Photo',
  stockStatus: 'In Stock',
  addedAt: 'Mar 5, 2026',
  lastChecked: '45 min ago',
  hasAlert: false,
  priceHistory: [
  { date: 'Mar 9', price: 329.00 },
  { date: 'Mar 16', price: 299.00 },
  { date: 'Mar 23', price: 269.00 },
  { date: 'Mar 30', price: 249.00 },
  { date: 'Apr 6', price: 229.00 }]

},
{
  id: 'wl-008',
  productName: 'iPad Air M2',
  model: 'MUWD3LL/A',
  color: 'Space Gray',
  imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&h=200&fit=crop',
  currentBestPrice: 549.00,
  currency: 'USD',
  originalPrice: 599.00,
  marketplaceCount: 10,
  bestMarketplace: 'Amazon',
  stockStatus: 'In Stock',
  addedAt: 'Feb 28, 2026',
  lastChecked: '8 min ago',
  hasAlert: true,
  priceHistory: [
  { date: 'Mar 9', price: 599.00 },
  { date: 'Mar 16', price: 589.00 },
  { date: 'Mar 23', price: 569.00 },
  { date: 'Mar 30', price: 559.00 },
  { date: 'Apr 6', price: 549.00 }]

}];


export const mockAlerts: PriceAlert[] = [
{
  id: 'alert-001',
  productName: 'Sony WH-1000XM5',
  model: 'WH-1000XM5',
  color: 'Black',
  imageUrl: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=200&h=200&fit=crop',
  targetPrice: 250.00,
  currentPrice: 261.89,
  currency: 'USD',
  originalPrice: 349.99,
  marketplace: 'Any marketplace',
  status: 'Active',
  emailEnabled: true,
  createdAt: 'Apr 1, 2026',
  priceHistory: [
  { date: 'Mar 9', price: 349.99 },
  { date: 'Mar 16', price: 319.99 },
  { date: 'Mar 23', price: 295.00 },
  { date: 'Mar 30', price: 275.00 },
  { date: 'Apr 6', price: 261.89 }],

  priceDrop: 25
},
{
  id: 'alert-002',
  productName: 'Samsung Galaxy S25 Ultra',
  model: 'SM-S938B',
  color: 'Titanium Gray',
  imageUrl: 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=200&h=200&fit=crop',
  targetPrice: 999.00,
  currentPrice: 1099.99,
  currency: 'USD',
  originalPrice: 1299.99,
  marketplace: 'Best Buy',
  status: 'Active',
  emailEnabled: true,
  createdAt: 'Mar 25, 2026',
  priceHistory: [
  { date: 'Mar 9', price: 1299.99 },
  { date: 'Mar 16', price: 1249.99 },
  { date: 'Mar 23', price: 1199.99 },
  { date: 'Mar 30', price: 1149.99 },
  { date: 'Apr 6', price: 1099.99 }],

  priceDrop: 23
},
{
  id: 'alert-003',
  productName: 'Apple AirPods Pro 2',
  model: 'MTJV3LL/A',
  color: 'White',
  imageUrl: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=200&h=200&fit=crop',
  targetPrice: 179.00,
  currentPrice: 179.00,
  currency: 'USD',
  originalPrice: 249.00,
  marketplace: 'Amazon',
  status: 'Triggered',
  emailEnabled: true,
  createdAt: 'Mar 28, 2026',
  lastTriggered: 'Apr 7, 2026 at 3:14 PM',
  priceHistory: [
  { date: 'Mar 9', price: 249.00 },
  { date: 'Mar 16', price: 229.00 },
  { date: 'Mar 23', price: 209.00 },
  { date: 'Mar 30', price: 189.99 },
  { date: 'Apr 6', price: 179.00 }],

  priceDrop: 28
},
{
  id: 'alert-004',
  productName: 'Nintendo Switch OLED',
  model: 'HEG-001',
  color: 'White',
  imageUrl: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=200&h=200&fit=crop',
  targetPrice: 280.00,
  currentPrice: 299.99,
  currency: 'USD',
  originalPrice: 349.99,
  marketplace: 'Any marketplace',
  status: 'Active',
  emailEnabled: false,
  createdAt: 'Mar 10, 2026',
  priceHistory: [
  { date: 'Mar 9', price: 349.99 },
  { date: 'Mar 16', price: 339.99 },
  { date: 'Mar 23', price: 319.99 },
  { date: 'Mar 30', price: 309.99 },
  { date: 'Apr 6', price: 299.99 }],

  priceDrop: 14
},
{
  id: 'alert-005',
  productName: 'iPad Air M2',
  model: 'MUWD3LL/A',
  color: 'Space Gray',
  imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&h=200&fit=crop',
  targetPrice: 499.00,
  currentPrice: 549.00,
  currency: 'USD',
  originalPrice: 599.00,
  marketplace: 'Amazon',
  status: 'Paused',
  emailEnabled: false,
  createdAt: 'Feb 28, 2026',
  priceHistory: [
  { date: 'Mar 9', price: 599.00 },
  { date: 'Mar 16', price: 589.00 },
  { date: 'Mar 23', price: 569.00 },
  { date: 'Mar 30', price: 559.00 },
  { date: 'Apr 6', price: 549.00 }],

  priceDrop: 8
}];