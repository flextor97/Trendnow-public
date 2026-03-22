import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const LS_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
    const STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;
    const VARIANT_ID = process.env.LEMON_SQUEEZY_VARIANT_ID;

    if (!LS_API_KEY || !STORE_ID || !VARIANT_ID) {
      throw new Error('LemonSqueezy configuration missing in .env.local');
    }

    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${LS_API_KEY}`
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              discount_code: '', // Optional
              // Handle international customers automatically
            },
            product_options: {
              redirect_url: `${process.env.NEXT_PUBLIC_URL}/success`,
            }
          },
          relationships: {
            store: {
              data: { type: 'stores', id: String(STORE_ID) }
            },
            variant: {
              data: { type: 'variants', id: String(VARIANT_ID) }
            }
          }
        }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('LemonSqueezy Error:', data.errors);
      return NextResponse.json({ error: data.errors[0].detail }, { status: 400 });
    }

    const checkoutUrl = data.data.attributes.url;
    return NextResponse.redirect(checkoutUrl, { status: 303 });
  } catch (err: unknown) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
