import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

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
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const { email, type } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // ── Sample data for preview ──────────────────────────────────────────────
    const sampleWatchlistItems = [
      { product_name: "Sony WH-1000XM5 Headphones", current_best_price: 279.99, original_price: 399.99, best_marketplace: "Amazon" },
      { product_name: "Apple AirPods Pro (2nd Gen)", current_best_price: 189.00, original_price: 249.00, best_marketplace: "Best Buy" },
      { product_name: "Samsung 65\" QLED 4K TV", current_best_price: 849.99, original_price: 1299.99, best_marketplace: "Walmart" },
      { product_name: "Dyson V15 Detect Vacuum", current_best_price: 549.99, original_price: 749.99, best_marketplace: "Target" },
      { product_name: "Nintendo Switch OLED", current_best_price: 299.99, original_price: 349.99, best_marketplace: "GameStop" },
    ];

    const sampleAlert = {
      product_name: "Sony WH-1000XM5 Headphones",
      target_price: 280.00,
      current_price: 279.99,
      marketplace: "Amazon",
      currency: "USD",
    };

    // ── Build Price Alert HTML ────────────────────────────────────────────────
    const priceAlertHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 32px 24px;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">📡 ShopRadar</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Price Alert Triggered</p>
          </div>

          <!-- Body -->
          <div style="padding: 32px;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #16a34a; text-transform: uppercase; letter-spacing: 0.05em;">🎉 Price Drop Alert</p>
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #111827;">${sampleAlert.product_name}</h2>
              <div style="display: flex; gap: 24px; flex-wrap: wrap;">
                <div>
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">Current Price</p>
                  <p style="margin: 4px 0 0; font-size: 28px; font-weight: 800; color: #16a34a; font-family: monospace;">$${sampleAlert.current_price.toFixed(2)}</p>
                </div>
                <div>
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">Your Target</p>
                  <p style="margin: 4px 0 0; font-size: 28px; font-weight: 800; color: #6366f1; font-family: monospace;">$${sampleAlert.target_price.toFixed(2)}</p>
                </div>
                <div>
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">Available At</p>
                  <p style="margin: 4px 0 0; font-size: 18px; font-weight: 700; color: #111827;">${sampleAlert.marketplace}</p>
                </div>
              </div>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">
              The price has dropped to your target! This is your chance to grab it before it goes back up.
            </p>

            <div style="text-align: center;">
              <a href="https://shopradar6671.builtwithrocket.new/watchlist-price-alerts" style="display: inline-block; background: #6366f1; color: white; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none;">View Alert & Buy Now →</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
              You're receiving this because you set a price alert on ShopRadar.<br>
              <a href="https://shopradar6671.builtwithrocket.new/settings" style="color: #6366f1;">Manage email preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ── Build Weekly Digest HTML ──────────────────────────────────────────────
    const itemRows = sampleWatchlistItems.map((item) => {
      const savings = item.original_price - item.current_best_price;
      const savingsPct = Math.round((savings / item.original_price) * 100);
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px; font-size: 14px; color: #111827; font-weight: 500;">${item.product_name}</td>
          <td style="padding: 12px 8px; font-size: 14px; color: #111827; font-weight: bold; font-family: monospace;">$${item.current_best_price.toFixed(2)}</td>
          <td style="padding: 12px 8px; font-size: 14px; color: #6b7280; text-decoration: line-through; font-family: monospace;">$${item.original_price.toFixed(2)}</td>
          <td style="padding: 12px 8px;">
            ${savingsPct > 0 ? `<span style="background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600;">−${savingsPct}%</span>` : '—'}
          </td>
          <td style="padding: 12px 8px; font-size: 12px; color: #6b7280;">${item.best_marketplace}</td>
        </tr>
      `;
    }).join('');

    const weeklyDigestHtml = `
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

    const emailsToSend = type === "price-alert"
      ? [{ subject: "📡 ShopRadar — Price Alert: Sony WH-1000XM5 hit your target! (Example)", html: priceAlertHtml }]
      : type === "weekly-digest"
      ? [{ subject: "📡 ShopRadar Weekly Digest — 5 items tracked (Example)", html: weeklyDigestHtml }]
      : [
          { subject: "📡 ShopRadar — Price Alert: Sony WH-1000XM5 hit your target! (Example)", html: priceAlertHtml },
          { subject: "📡 ShopRadar Weekly Digest — 5 items tracked (Example)", html: weeklyDigestHtml },
        ];

    const results = [];

    for (const emailData of emailsToSend) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "chrismuirhead0903@gmail.com",
          to: email,
          subject: emailData.subject,
          html: emailData.html,
        }),
      });

      if (resendRes.ok) {
        results.push({ subject: emailData.subject, status: "sent" });
      } else {
        const err = await resendRes.text();
        results.push({ subject: emailData.subject, status: `failed: ${err}` });
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
