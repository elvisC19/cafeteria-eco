'use client';
import { useEffect, useState } from 'react';

export default function Loading() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FBF3E8] text-[#3B2B24]">
      {/* Coffee cup animation container */}
      <div className="relative flex flex-col items-center">
        {/* Steam waves */}
        <div className="flex gap-2 mb-2 justify-center h-10 w-20 relative">
          <div className="w-1 bg-[#8A6F57] rounded-full animate-steam-wave" style={{ animationDelay: '0.1s' }} />
          <div className="w-1 bg-[#8A6F57] rounded-full animate-steam-wave-tall" style={{ animationDelay: '0.3s' }} />
          <div className="w-1 bg-[#8A6F57] rounded-full animate-steam-wave" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Cup body */}
        <div className="relative w-24 h-20 bg-[#FFFFFF] border-4 border-[#3B2B24] rounded-b-3xl flex items-end overflow-hidden shadow-md">
          {/* Coffee liquid */}
          <div className="w-full bg-[#3B2B24] animate-fill-coffee" style={{ height: '70%' }} />
          
          {/* Internal plant reflection/shine */}
          <div className="absolute top-1 left-2 w-2 h-10 bg-white/40 rounded-full blur-[1px]" />
        </div>

        {/* Cup handle */}
        <div className="absolute right-[-14px] top-6 w-5 h-10 border-4 border-[#3B2B24] border-l-0 rounded-r-full" />
        
        {/* Saucer */}
        <div className="w-32 h-3 bg-[#3B2B24] rounded-full mt-2 shadow-sm" />

        {/* Leaf/Plant Accent */}
        <div className="absolute -top-12 -left-12 opacity-80 animate-bounce" style={{ animationDuration: '3s' }}>
          <svg className="w-8 h-8 text-[#607C5B]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17,8C8,8 4,16 3,21C3,21 9,20 13,16C16,13 17,9 17,8M21,2C12,2 8,10 7,15C7,15 13,14 17,10C20,7 21,3 21,2Z"/>
          </svg>
        </div>
        
        <div className="absolute -bottom-10 -right-12 opacity-80 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}>
          <svg className="w-6 h-6 text-[#607C5B] rotate-45" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17,8C8,8 4,16 3,21C3,21 9,20 13,16C16,13 17,9 17,8M21,2C12,2 8,10 7,15C7,15 13,14 17,10C20,7 21,3 21,2Z"/>
          </svg>
        </div>
      </div>

      {/* Brand & Loading text */}
      <div className="mt-16 text-center animate-pulse">
        <h2 className="text-xl font-bold tracking-widest text-[#3B2B24]" style={{ fontFamily: 'var(--font-playfair), serif' }}>
          CHARCAS CAPITAL
        </h2>
        <p className="text-xs text-[#8A6F57] uppercase tracking-widest mt-1 font-medium">
          Café de Especialidad
        </p>
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#6B564C]">
          <span>Preparando experiencia</span>
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-[#8A6F57] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-1.5 h-1.5 bg-[#8A6F57] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <span className="w-1.5 h-1.5 bg-[#8A6F57] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </span>
        </div>
      </div>

      {/* Styled JSX for the custom loading keyframes */}
      <style jsx global>{`
        @keyframes steam-wave {
          0%, 100% {
            height: 10px;
            opacity: 0.3;
            transform: translateY(0) scaleX(1);
          }
          50% {
            height: 25px;
            opacity: 0.8;
            transform: translateY(-8px) scaleX(1.2);
          }
        }
        @keyframes steam-wave-tall {
          0%, 100% {
            height: 15px;
            opacity: 0.3;
            transform: translateY(0) scaleX(1);
          }
          50% {
            height: 35px;
            opacity: 0.9;
            transform: translateY(-12px) scaleX(1.3);
          }
        }
        @keyframes fill-coffee {
          0% {
            height: 0%;
          }
          100% {
            height: 75%;
          }
        }
        .animate-steam-wave {
          animation: steam-wave 2s infinite ease-in-out;
        }
        .animate-steam-wave-tall {
          animation: steam-wave-tall 2s infinite ease-in-out;
        }
        .animate-fill-coffee {
          animation: fill-coffee 3s infinite alternate ease-in-out;
        }
      `}</style>
    </div>
  );
}
