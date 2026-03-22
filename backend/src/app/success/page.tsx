'use client';

import { CheckCircle2, Laptop } from 'lucide-react';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#09090c] text-white flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#09090c] to-[#111216]">
      <div className="w-24 h-24 bg-[#ff935c]/20 rounded-full flex items-center justify-center text-[#ff935c] mb-10 shadow-[0_0_80px_rgba(255,147,92,.2)] border border-[#ff935c]/30">
        <CheckCircle2 size={56} strokeWidth={1.5} />
      </div>

      <h1 className="text-4xl md:text-5xl font-black mb-4 text-center">Payment Successful!</h1>
      <p className="text-xl text-[#8e96a7] mb-12 text-center max-w-lg">
        Pro Features are now being unlocked across your devices. This usually takes under 30 seconds.
      </p>

      <div className="bg-[#1a1b21] p-8 rounded-3xl border border-white/5 max-w-md w-full mb-10 text-center">
        <div className="flex items-center gap-3 justify-center mb-6 text-[#ff935c] font-bold text-sm uppercase tracking-widest">
           <Laptop size={18} /> Activation Steps
        </div>
        <ol className="text-left space-y-4 text-[#c5cbd6]">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center text-xs font-bold">1</span>
            <span>Open your **TrendNow Chrome Extension**</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center text-xs font-bold">2</span>
            <span>If you see the **PRO** badge, you&apos;re all set.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center text-xs font-bold">3</span>
            <span>If not, click **Refresh (RF)** to sync your status.</span>
          </li>
        </ol>
      </div>

      <button 
        onClick={() => window.close()}
        className="px-8 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-sm font-bold uppercase tracking-wider"
      >
        Close Tab
      </button>
    </div>
  );
}
