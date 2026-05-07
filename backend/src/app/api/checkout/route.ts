import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const { amount = 159900, currency = 'INR' } = await req.json(); // ₹1,599 ≈ $19 USD - Best international price for lifetime Pro access

    const options = {
      amount: amount,
      currency: currency,
      receipt: 'receipt_' + Date.now(),
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}