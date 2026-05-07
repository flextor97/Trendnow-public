'use client';

import { useState, useEffect } from 'react';

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', amount: 159900 }), // 1599 INR in paise
      });

      const data = await res.json();

      if (!data.success || !data.orderId) {
        alert('Failed to create order: ' + (data.error || 'Unknown error'));
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'TrendNow Pro',
        description: 'Lifetime Access + Updates',
        order_id: data.orderId,
        handler: function (response: any) {
          // Payment successful - verify on backend if needed
          window.location.href = `/success?payment_id=${response.razorpay_payment_id}&order_id=${response.razorpay_order_id}`;
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#f97316',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error(error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 px-4 py-1 rounded-full text-sm font-medium">
            🔥 PRO ACCESS PLAN
          </span>
        </div>

        <h1 className="text-5xl font-bold text-center leading-tight mb-4">
          Spot Breakouts<br />Before They Breakout.
        </h1>
        <p className="text-xl text-gray-400 text-center mb-12 max-w-md mx-auto">
          Unlock the advanced signals architecture used by professional curators to dominate trending topics.
        </p>

        <div className="bg-zinc-900 border border-orange-500/30 rounded-3xl p-8">
          <div className="flex justify-between items-baseline mb-8">
            <div>
              <h2 className="text-3xl font-semibold">TrendNow Pro</h2>
              <p className="text-gray-400">Lifetime Access + Updates</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-orange-400">₹1,599</div>
              <div className="text-sm text-gray-400">One-time payment</div>
            </div>
          </div>

          <ul className="space-y-4 mb-10">
            <li className="flex items-center gap-3">
              <span className="text-green-400 text-xl">✔</span>
              <span className="text-gray-200">Unlimited Real-time Alerts</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-400 text-xl">✔</span>
              <span className="text-gray-200">International Region Access</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-400 text-xl">✔</span>
              <span className="text-gray-200">Worldwide Mode Scanning</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-400 text-xl">✔</span>
              <span className="text-gray-200">Advanced Momentum Proof</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-400 text-xl">✔</span>
              <span className="text-gray-200">Viral Probability Score</span>
            </li>
            {/* add more if needed */}
          </ul>

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-5 rounded-2xl text-xl transition-all disabled:opacity-50"
          >
            {loading ? 'Opening Checkout...' : 'Unlock Pro Instantly'}
          </button>

          <p className="text-center text-xs text-gray-400 mt-6">
            Safe and secure checkout via Razorpay • UPI, Cards, Wallets, Netbanking supported
          </p>
        </div>
      </div>
    </div>
  );
}
