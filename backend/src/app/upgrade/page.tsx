import { Check, Zap } from 'lucide-react';

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-[#09090c] text-[#f3f7fb] font-sans selection:bg-[#ff935c] selection:text-white">
      {/* Hero Section */}
      <nav className="border-b border-white/5 py-6 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(98,232,255,.3)]">
              <span className="text-black font-bold text-xl leading-none">T</span>
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-[#b6ecff] to-white bg-clip-text text-transparent">TrendNow</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-[#8e96a7]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">Login</a>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-md mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#ff935c]/30 bg-[#ff935c]/10 text-[#ff935c] text-xs font-bold uppercase tracking-widest mb-6">
            <Zap size={14} fill="currentColor" /> Pro Access Plan
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">Spot Breakouts <br />Before They Breakout.</h1>
          <p className="text-lg text-[#8e96a7] leading-relaxed max-w-lg mx-auto">
            Unlock the advanced signals architecture used by professional curators to dominate trending topics.
          </p>
        </div>

        {/* Pricing Card */}
        <div id="pricing" className="relative p-1 rounded-3xl bg-gradient-to-b from-[#ff935c] to-[#ff5858] shadow-[0_0_60px_rgba(255,147,92,.25)]">
          <div className="bg-[#111216] rounded-[calc(1.5rem-1px)] p-10 md:p-12">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-2xl font-bold mb-2">TrendNow Pro</h3>
                <p className="text-[#8e96a7]">Lifetime Access + Updates</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black">$9.99</div>
                <div className="text-[#8e96a7] text-sm italic">One-time payment</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <FeatureItem label="Unlimited Real-time Alerts" />
              <FeatureItem label="Advanced Momentum Proof" />
              <FeatureItem label="International Region Access" />
              <FeatureItem label="Viral Probability Score" />
              <FeatureItem label="Worldwide Mode Scanning" />
              <FeatureItem label="Unlimited Trend Tracking" />
              <FeatureItem label="High Yield Keyword Fallbacks" />
              <FeatureItem label="Priority Notification Sound" />
            </div>

            <form action="/api/checkout" method="POST">
              <button 
                type="submit"
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#ff935c] to-[#ff5858] text-white font-black text-xl hover:scale-[1.02] transition-transform active:scale-[0.98] shadow-lg shadow-[#ff935c]/20"
              >
                Unlock Pro Instantly
              </button>
            </form>
            
            <p className="mt-6 text-center text-sm text-[#8e96a7]">
              Safe and secure checkout via Stripe. Global payments supported including India.
            </p>
          </div>
        </div>

        {/* Social Proof Placeholder */}
        <div className="mt-20 flex flex-wrap justify-center gap-12 opacity-40 grayscale contrast-150">
          <div className="text-2xl font-black tracking-tighter italic">YouTube</div>
          <div className="text-2xl font-black tracking-tighter">REDDIT</div>
          <div className="text-2xl font-black tracking-tighter uppercase italic">Trends</div>
        </div>
      </main>

      <footer className="py-12 text-center text-[#667086] text-xs border-t border-white/5">
        &copy; 2026 TrendNow. Built for creators.
      </footer>
    </div>
  );
}

function FeatureItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-[#ff935c]/20 flex items-center justify-center text-[#ff935c]">
        <Check size={12} strokeWidth={4} />
      </div>
      <span className="text-sm font-medium text-[#c5cbd6]">{label}</span>
    </div>
  );
}
