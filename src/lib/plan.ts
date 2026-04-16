const ADMIN_ID = '2c8fdd0b-b3b6-4216-a541-1cf40490658a';

export type Plan = 'free' | 'pro' | 'radar_plus';

export function getEffectivePlan(user: any, profile?: any): Plan {
  if (!user) return 'free';
  if (user.id === ADMIN_ID) return 'radar_plus';
  const plan = profile?.subscription_plan || 'free';
  if (plan === 'radar_plus') return 'radar_plus';
  if (plan === 'pro') return 'pro';
  return 'free';
}

export function canUseFeature(plan: Plan, feature: keyof typeof PLAN_FEATURES): boolean {
  return PLAN_FEATURES[feature][plan];
}

export const PLAN_FEATURES = {
  unlimited_searches:    { free: false, pro: false, radar_plus: true  },
  ai_recommendations:    { free: false, pro: true,  radar_plus: true  },
  email_alerts:          { free: false, pro: true,  radar_plus: true  },
  screenshot_preview:    { free: false, pro: true,  radar_plus: true  },
  price_history_chart:   { free: false, pro: true,  radar_plus: true  },
  csv_export:            { free: false, pro: true,  radar_plus: true  },
  deal_score:            { free: false, pro: false, radar_plus: true  },
  price_prediction:      { free: false, pro: false, radar_plus: true  },
  sms_alerts:            { free: false, pro: false, radar_plus: true  },
  multi_country:         { free: false, pro: false, radar_plus: true  },
  saved_searches:        { free: false, pro: false, radar_plus: true  },
  barcode_scanner:       { free: false, pro: false, radar_plus: true  },
  priority_scanning:     { free: false, pro: false, radar_plus: true  },
  unlimited_watchlist:   { free: false, pro: false, radar_plus: true  },
  extended_history:      { free: false, pro: true,  radar_plus: true  },
} as const;

export const PLAN_LIMITS = {
  free:       { searches_per_day: 5,       watchlist_items: 3,        history_days: 30,  results: 10 },
  pro:        { searches_per_day: 100,      watchlist_items: 25,       history_days: 90,  results: 25 },
  radar_plus: { searches_per_day: Infinity, watchlist_items: Infinity, history_days: 365, results: 50 },
} as const;

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
  radar_plus: 'Radar+',
};
