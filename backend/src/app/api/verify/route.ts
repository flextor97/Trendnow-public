import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token'); // Email or Supabase Auth token

  if (!token) {
    return NextResponse.json({ isPro: false }, { status: 400 });
  }

  try {
    // Check if the user has is_pro = true in our database
    // For simplicity, we use email as token if not using a full Auth system yet
    const { data, error } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('email', token)
      .single();

    if (error || !data) {
      return NextResponse.json({ isPro: false });
    }

    return NextResponse.json({ isPro: data.isPro });
  } catch (err) {
    return NextResponse.json({ isPro: false });
  }
}
