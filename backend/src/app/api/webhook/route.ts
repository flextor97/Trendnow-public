import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const email = formData.get('email');

    if (email) {
      console.log(`💰 [Gumroad] Received payment from ${email}. Unlocking Pro Features...`);

      // Upsert the user into the profiles table and mark as Pro
      const { error } = await supabaseAdmin
        .from('profiles')
        .upsert({ 
          email: String(email), 
          is_pro: true, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'email' });

      if (error) {
        console.error('❌ Error updating Supabase profile:', error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
