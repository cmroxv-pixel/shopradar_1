<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into ShopRadar. Here's a summary of all changes made:

## Integration summary

- **`instrumentation-client.ts`** (new) — Client-side PostHog initialization using the `instrumentation-client` pattern for Next.js 15. Configures a `/ingest` reverse proxy, enables automatic exception capture (`capture_exceptions: true`), and enables debug logging in development.
- **`src/lib/posthog-server.ts`** (new) — Server-side PostHog helper using `posthog-node`. Creates a fresh client per invocation with `flushAt: 1` and `flushInterval: 0` to ensure immediate delivery from Next.js API routes.
- **`next.config.mjs`** (updated) — Added `/ingest` reverse proxy rewrites pointing to `https://us.i.posthog.com` and `https://us-assets.i.posthog.com`, plus `skipTrailingSlashRedirect: true` for PostHog compatibility.
- **`.env.local`** (updated) — Added `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`.

## Events instrumented

| Event | Description | File |
|---|---|---|
| `user_signed_up` | User successfully created a new account | `src/app/sign-up-login/components/AuthClient.tsx` |
| `user_logged_in` | User successfully signed in to an existing account | `src/app/sign-up-login/components/AuthClient.tsx` |
| `product_searched` | User submitted a product search query | `src/app/product-search-results/components/SearchResultsClient.tsx` |
| `search_results_received` | Search results were returned and displayed to the user | `src/app/product-search-results/components/SearchResultsClient.tsx` |
| `product_added_to_watchlist` | User added a product listing to their watchlist | `src/app/product-search-results/components/SearchResultsClient.tsx` |
| `product_compare_toggled` | User added or removed a product from the comparison tray | `src/app/product-search-results/components/SearchResultsClient.tsx` |
| `sort_option_changed` | User changed the result sort order | `src/app/product-search-results/components/SearchResultsClient.tsx` |
| `watchlist_item_removed` | User removed a product from their watchlist | `src/app/watchlist-price-alerts/components/WatchlistClient.tsx` |
| `price_alert_deleted` | User deleted a price alert | `src/app/watchlist-price-alerts/components/WatchlistClient.tsx` |
| `price_alert_toggled` | User paused or resumed a price alert | `src/app/watchlist-price-alerts/components/WatchlistClient.tsx` |
| `api_search_completed` | Server-side: SerpApi product search completed successfully | `src/app/api/serpapi/search/route.ts` |
| `api_price_alert_created` | Server-side: A new price alert was created via the API | `src/app/api/alerts/route.ts` |

### User identification

`posthog.identify()` is called with the user's email as distinct ID on both login and signup in `AuthClient.tsx`. The client passes its distinct ID via `x-posthog-distinct-id` header to the SerpApi search route so server-side and client-side events are correlated. The alerts API route uses the authenticated `userId` directly as the distinct ID.

### Error tracking

`posthog.captureException()` is called on auth errors in `AuthClient.tsx` and on search failures in `SearchResultsClient.tsx`. Unhandled exceptions are captured automatically via `capture_exceptions: true` in `instrumentation-client.ts`.

## Next steps

We've built a dashboard and insights for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/382608/dashboard/1469068
- **Signup & Login Trend**: https://us.posthog.com/project/382608/insights/qx4T4cKm
- **Search-to-Watchlist Conversion Funnel**: https://us.posthog.com/project/382608/insights/4isISMIB
- **Daily Search Volume**: https://us.posthog.com/project/382608/insights/VwI0vQsA
- **Price Alert Creation Trend**: https://us.posthog.com/project/382608/insights/5aBUyhLB
- **Watchlist Engagement: Add vs Remove**: https://us.posthog.com/project/382608/insights/0ychzmD1

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
