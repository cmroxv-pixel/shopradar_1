// supabase/functions/check-price-alerts/index.ts
// Edge Function: Scans all Active price alerts, simulates a live price check
// (updates current_price), which triggers the DB trigger to fire notifications.
// Sender email for outgoing alerts: chrismuirhead0903@gmail.com

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use service role to bypass RLS and access all users' alerts
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all Active price alerts
    const { data: alerts, error: fetchError } = await supabase
      .from('price_alerts')
      .select('id, user_id, product_name, target_price, current_price, currency, alert_status')
      .eq('alert_status', 'Active');

    if (fetchError) {
      console.error('Error fetching alerts:', fetchError.message);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active alerts to check', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let triggeredCount = 0;
    const results: { id: string; triggered: boolean; reason?: string }[] = [];

    for (const alert of alerts) {
      // Simulate a live price fetch: in production, replace this with a real
      // price API call using the product name / marketplace.
      // For now we re-use the stored current_price so the trigger evaluates it.
      const livePrice: number = alert.current_price;

      if (livePrice <= alert.target_price) {
        // Update current_price — the DB trigger handles status + in-app notification
        const { error: updateError } = await supabase
          .from('price_alerts')
          .update({ current_price: livePrice })
          .eq('id', alert.id);

        if (updateError) {
          results.push({ id: alert.id, triggered: false, reason: updateError.message });
          continue;
        }

        triggeredCount++;
        results.push({ id: alert.id, triggered: true });
      } else {
        results.push({ id: alert.id, triggered: false, reason: 'Price above target' });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Checked ${alerts.length} alerts, triggered ${triggeredCount}`,
        processed: alerts.length,
        triggered: triggeredCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
