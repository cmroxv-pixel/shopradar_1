'use client';
import { usePostHog } from 'posthog-js/react';
import { useCallback } from 'react';

export function useAnalytics() {
  const posthog = usePostHog();

  const trackSearch = useCallback((query: string, resultCount: number, country: string) => {
    posthog?.capture('product_searched', {
      query,
      result_count: resultCount,
      country,
      timestamp: new Date().toISOString(),
    });
  }, [posthog]);

  const trackAIAnalysis = useCallback((query: string, verdict: string, confidence: string, marketplace: string, price: number) => {
    posthog?.capture('ai_analysis_requested', {
      query,
      verdict,
      confidence,
      marketplace,
      price,
      timestamp: new Date().toISOString(),
    });
  }, [posthog]);

  const trackDealClick = useCallback((query: string, marketplace: string, price: number, currency: string) => {
    posthog?.capture('deal_clicked', {
      query,
      marketplace,
      price,
      currency,
      timestamp: new Date().toISOString(),
    });
  }, [posthog]);

  const trackWatchlistAdd = useCallback((query: string, price: number, marketplace: string) => {
    posthog?.capture('watchlist_item_added', {
      query,
      price,
      marketplace,
    });
  }, [posthog]);

  const trackAlertSet = useCallback((query: string, currentPrice: number, targetPrice: number) => {
    posthog?.capture('price_alert_set', {
      query,
      current_price: currentPrice,
      target_price: targetPrice,
      discount_sought: Math.round(((currentPrice - targetPrice) / currentPrice) * 100),
    });
  }, [posthog]);

  const trackScreenshotView = useCallback((marketplace: string, query: string) => {
    posthog?.capture('screenshot_previewed', {
      marketplace,
      query,
    });
  }, [posthog]);

  const identifyUser = useCallback((userId: string, email: string, name?: string) => {
    posthog?.identify(userId, { email, name });
  }, [posthog]);

  return {
    trackSearch,
    trackAIAnalysis,
    trackDealClick,
    trackWatchlistAdd,
    trackAlertSet,
    trackScreenshotView,
    identifyUser,
  };
}
