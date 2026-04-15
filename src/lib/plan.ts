// Utility to get a user's effective subscription plan
// Admin account automatically gets Radar+ for free

const ADMIN_ID = '2c8fdd0b-b3b6-4216-a541-1cf40490658a';

export type Plan = 'free' | 'pro' | 'radar_plus';

export function getEffectivePlan(user: any, profile?: any): Plan {
  if (!user) return 'free';
  // Admin always gets Radar+
  if (user.id === ADMIN_ID) return 'radar_plus';
  // Use subscription from profile if available
  const plan = profile?.subscription_plan || 'free';
  if (plan === 'radar_plus') return 'radar_plus';
  if (plan === 'pro') return 'pro';
  return 'free';
}

export function canUseFeature(plan: Plan, feature: keyof typeof PLAN_FEATURES): boolean {
  return PLAN_FEATURES[feature][plan];
}

export const PLAN_FEATURES = {
  unlimited_searches:    { free: false, pro: true,  radar_plus: true  },
  ai_recommendations:    { free: false, pro: true,  radar_plus: true  },
  email_alerts:          { free: false, pro: true,  radar_plus: true  },
  screenshot_preview:    { free: false, pro: true,  radar_plus: true  },
  sms_alerts:            { free: false, pro: false, radar_plus: true  },
  csv_export:            { free: false, pro: false, radar_plus: true  },
  priority_scanning:     { free: false, pro: false, radar_plus: true  },
  extended_history:      { free: false, pro: true,  radar_plus: true  },
  unlimited_watchlist:   { free: false, pro: false, radar_plus: true  },
} as const;

export const PLAN_LIMITS = {
  free:       { searches_per_day: 5,         watchlist_items: 3,  history_days: 30  },
  pro:        { searches_per_day: Infinity,   watchlist_items: 25, history_days: 90  },
  radar_plus: { searches_per_day: Infinity,   watchlist_items: Infinity, history_days: 365 },
} as const;

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
  radar_plus: 'Radar+',
};
