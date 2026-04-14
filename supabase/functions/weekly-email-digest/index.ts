import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with email digest enabled (notification_settings table)
    const { data: users, error: usersError } = await supabase
      .from("notification_settings")
      .select("user_id, email_digest")
      .eq("email_digest", true);

    if (usersError) throw usersError;

    const results: { userId: string; status: string }[] = [];

    for (const userSetting of (users || [])) {
      const userId = userSetting.user_id;

      // Get user email
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email;
      if (!email) continue;

      // Get user's watchlist items with price history
      const { data: watchlistItems } = await supabase
        .from("watchlist_items")
        .select("*")
        .eq("user_id", userId)
        .limit(10);

      if (!watchlistItems || watchlistItems.length === 0) continue;

      // Build email HTML
      const itemRows = watchlistItems.map((item: any) => {
        const savings = item.original_price - item.current_best_price;
        const savingsPct = Math.round((savings / item.original_price) * 100);
        return `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 8px; font-size: 14px; color: #111827; font-weight: 500;">${item.product_name}</td>
            <td style="padding: 12px 8px; font-size: 14px; color: #111827; font-weight: bold; font-family: monospace;">$${Number(item.current_best_price).toFixed(2)}</td>
            <td style="padding: 12px 8px; font-size: 14px; color: #6b7280; text-decoration: line-through; font-family: monospace;">$${Number(item.original_price).toFixed(2)}</td>
            <td style="padding: 12px 8px;">
              ${savingsPct > 0 ? `<span style="background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600;">−${savingsPct}%</span>` : '—'}
            </td>
            <td style="padding: 12px 8px; font-size: 12px; color: #6b7280;">${item.best_marketplace || '—'}</td>
          </tr>
        `;
      }).join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 32px 24px;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">📡 ShopRadar</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Your weekly price digest</p>
            </div>

            <!-- Body -->
            <div style="padding: 32px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 8px;">This week's watchlist summary</h2>
              <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Here's how the prices on your watchlist have moved this week.</p>

              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Product</th>
                    <th style="padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Best Price</th>
                    <th style="padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Was</th>
                    <th style="padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Saving</th>
                    <th style="padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Best At</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>

              <div style="margin-top: 32px; text-align: center;">
                <a href="https://shopradar6671.builtwithrocket.new/watchlist-price-alerts" style="display: inline-block; background: #6366f1; color: white; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none;">View full watchlist →</a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
                You're receiving this because you enabled weekly digests in ShopRadar.<br>
                <a href="https://shopradar6671.builtwithrocket.new/settings" style="color: #6366f1;">Manage email preferences</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send via Resend
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "chrismuirhead0903@gmail.com",
          to: email,
          subject: `📡 ShopRadar Weekly Digest — ${watchlistItems.length} items tracked`,
          html: emailHtml,
        }),
      });

      if (resendRes.ok) {
        results.push({ userId, status: "sent" });
      } else {
        const err = await resendRes.text();
        results.push({ userId, status: `failed: ${err}` });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
