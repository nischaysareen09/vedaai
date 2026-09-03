'use client';

import { Sparkles } from 'lucide-react';

export default function LoadingState({ label = 'Extracting...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center animate-fade-in">
        {/* Animated Sparkles Icon */}
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 animate-ping">
            <Sparkles className="w-16 h-16 text-orange-400 opacity-75" />
          </div>
          <Sparkles className="w-16 h-16 text-orange-500 relative z-10 animate-breathe" />
        </div>

        {/* Text */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2 transition-all duration-300">
          {label}
        </h2>

        {/* Animated progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-breathe"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>

        <p className="text-gray-500 text-sm">This may take a while</p>
      </div>
    </div>
  );
}