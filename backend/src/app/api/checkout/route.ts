import { NextResponse } from 'next/server';

export async function POST() {
  // Redirect directly to your Gumroad product
  return NextResponse.redirect('https://998525715789.gumroad.com/l/alkla', { status: 303 });
}
