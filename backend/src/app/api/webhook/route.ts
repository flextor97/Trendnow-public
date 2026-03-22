import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature') as string;
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET as string;

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Signature or secret missing' }, { status: 401 });
    }

    // Verify signature
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(rawBody).digest('hex');

    if (signature !== digest) {
      console.error('❌ Invalid Webhook Signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;
    const data = payload.data;

    // Supported events: order_created (one-time) or subscription_created (recurring)
    if (eventName === 'order_created' || eventName === 'subscription_created') {
      const userEmail = data.attributes.user_email;
      
      console.log(`💰 [LemonSqueezy] Received payment from ${userEmail}. Unlocking Pro Features...`);

      // Upsert the user into the profiles table and mark as Pro
      const { error } = await supabaseAdmin
        .from('profiles')
        .upsert({ 
          email: userEmail, 
          is_pro: true, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'email' });

      if (error) {
        console.error('❌ Error updating Supabase profile:', error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
