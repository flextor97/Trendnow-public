## Backend Setup

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase and Razorpay credentials
3. Run `npm install`
4. Run `npm run dev`

### Razorpay

Make sure you have these in your environment variables:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

After successful payment, update user `is_pro` status in Supabase.