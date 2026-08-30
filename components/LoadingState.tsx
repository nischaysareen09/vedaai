'use client';

import { Sparkles } from 'lucide-react';

export default function LoadingState({ label = 'Extracting...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        {/* Animated Sparkles Icon */}
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 animate-ping">
            <Sparkles className="w-16 h-16 text-orange-400 opacity-75" />
          </div>
          <Sparkles className="w-16 h-16 text-orange-500 relative z-10 animate-pulse" />
        </div>

        {/* Text */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{label}</h2>
        <p className="text-gray-500 text-sm">This may take a while</p>
      </div>
    </div>
  );
}