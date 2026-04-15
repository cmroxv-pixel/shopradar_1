import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { userId, userEmail, productName, currentPrice, targetPrice, marketplace, listingUrl } = await req.json();

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
        to: userEmail,
        subject: `🎉 Price drop! ${productName} is now A$${currentPrice}`,
        html: `
          <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 560px; margin: 0 auto; background: #0d0d0d; color: #fff; border-radius: 16px; overflow: hidden;">
            <div style="background: #0055ee; padding: 32px 32px 24px;">
              <img src="https://shopradar-1.vercel.app/logo.png" alt="ShopRadar" style="width: 36px; height: 36px; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">Price drop alert! 🎉</h1>
              <p style="margin: 8px 0 0; opacity: 0.8; font-size: 15px;">Your target price has been reached</p>
            </div>
            <div style="padding: 28px 32px;">
              <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #fff;">${productName}</h2>
              <p style="margin: 0 0 20px; color: #888; font-size: 14px;">${marketplace}</p>
              <div style="display: flex; gap: 24px; margin-bottom: 24px;">
                <div style="background: #111; border-radius: 12px; padding: 16px 20px; flex: 1;">
                  <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Current Price</p>
                  <p style="margin: 6px 0 0; font-size: 28px; font-weight: 800; color: #22c55e;">A$${currentPrice}</p>
                </div>
                <div style="background: #111; border-radius: 12px; padding: 16px 20px; flex: 1;">
                  <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Your Target</p>
                  <p style="margin: 6px 0 0; font-size: 28px; font-weight: 800; color: #888;">A$${targetPrice}</p>
                </div>
              </div>
              <a href="${listingUrl}" style="display: block; text-align: center; background: #0055ee; color: white; text-decoration: none; padding: 14px 24px; border-radius: 100px; font-weight: 700; font-size: 15px; margin-bottom: 16px;">View Deal →</a>
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

    // Log the alert was sent in Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.from('price_alerts').update({ last_triggered: new Date().toISOString(), alert_status: 'Triggered' })
      .eq('user_id', userId).eq('product_name', productName);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
