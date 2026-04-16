import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  parseBody, sanitiseString, sanitiseNumber, sanitiseUrl,
  sanitiseEmail, isValidUUID, badRequest, LIMITS,
} from '@/lib/validate';

export async function POST(req: NextRequest) {
  const [body, err] = await parseBody(req, 8_000);
  if (err) return err;

  const { userId, userEmail, productName, currentPrice, targetPrice, marketplace, listingUrl } = body as any;

  // ── Validate ─────────────────────────────────────────────────────────────
  if (!isValidUUID(userId))           return badRequest('Invalid userId');

  const cleanEmail = sanitiseEmail(userEmail);
  if (!cleanEmail)                     return badRequest('Invalid email address');

  const cleanProductName = sanitiseString(productName, LIMITS.PRODUCT_NAME_MAX);
  if (!cleanProductName)               return badRequest('Invalid productName');

  const cleanCurrentPrice = sanitiseNumber(currentPrice, 0.01, LIMITS.PRICE_MAX, -1);
  if (cleanCurrentPrice < 0)           return badRequest('Invalid currentPrice');

  const cleanTargetPrice  = sanitiseNumber(targetPrice, 0.01, LIMITS.PRICE_MAX, -1);
  if (cleanTargetPrice < 0)            return badRequest('Invalid targetPrice');

  const cleanMarketplace = sanitiseString(marketplace, LIMITS.MARKETPLACE_MAX) ?? 'Unknown';
  const cleanListingUrl  = sanitiseUrl(listingUrl) ?? '#';
  // ─────────────────────────────────────────────────────────────────────────

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: 'No email provider configured' }, { status: 500 });

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ShopRadar <alerts@shopradar.app>',
        to: cleanEmail,
        subject: `🎉 Price drop! ${cleanProductName} is now A$${cleanCurrentPrice}`,
        html: `
          <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 560px; margin: 0 auto; background: #0d0d0d; color: #fff; border-radius: 16px; overflow: hidden;">
            <div style="background: #0055ee; padding: 32px 32px 24px;">
              <img src="https://shopradar-1.vercel.app/logo.png" alt="ShopRadar" style="width: 36px; height: 36px; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">Price drop alert! 🎉</h1>
              <p style="margin: 8px 0 0; opacity: 0.8; font-size: 15px;">Your target price has been reached</p>
            </div>
            <div style="padding: 28px 32px;">
              <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #fff;">${cleanProductName}</h2>
              <p style="margin: 0 0 20px; color: #888; font-size: 14px;">${cleanMarketplace}</p>
              <div style="display: flex; gap: 24px; margin-bottom: 24px;">
                <div style="background: #111; border-radius: 12px; padding: 16px 20px; flex: 1;">
                  <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Current Price</p>
                  <p style="margin: 6px 0 0; font-size: 28px; font-weight: 800; color: #22c55e;">A$${cleanCurrentPrice}</p>
                </div>
                <div style="background: #111; border-radius: 12px; padding: 16px 20px; flex: 1;">
                  <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Your Target</p>
                  <p style="margin: 6px 0 0; font-size: 28px; font-weight: 800; color: #888;">A$${cleanTargetPrice}</p>
                </div>
              </div>
              <a href="${cleanListingUrl}" style="display: block; text-align: center; background: #0055ee; color: white; text-decoration: none; padding: 14px 24px; border-radius: 100px; font-weight: 700; font-size: 15px; margin-bottom: 16px;">View Deal →</a>
              <a href="https://shopradar-1.vercel.app/watchlist-price-alerts" style="display: block; text-align: center; color: #666; text-decoration: none; font-size: 13px;">Manage your alerts</a>
            </div>
            <div style="padding: 20px 32px; border-top: 1px solid #222; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #444;">ShopRadar · <a href="https://shopradar-1.vercel.app/settings" style="color: #444;">Unsubscribe</a></p>
            </div>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.from('price_alerts')
      .update({ last_triggered: new Date().toISOString(), alert_status: 'Triggered' })
      .eq('user_id', userId)
      .eq('product_name', cleanProductName);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
