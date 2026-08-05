import React from 'react';
import logoImage from '../assets/logo.jpeg';
import { Printer } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-[#0B1B3A] text-white px-6 py-4 flex items-center justify-between shadow-md select-none border-b border-slate-800">
      {/* Left side: Logo & Titles */}
      <div className="flex items-center space-x-4">
        <div className="w-14 h-14 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg border border-slate-200 overflow-hidden shrink-0">
          <img 
            src={logoImage} 
            alt="Matadin Ram Bhandar" 
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
            Label Print Utility
          </h1>
          <span className="text-sm font-medium text-slate-300">
            Matadin Ram Bhandar
          </span>
        </div>
      </div>

      {/* Right side: Amber Status Text */}
      <div className="flex items-center space-x-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-4 py-2 rounded-full">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F59E0B]"></span>
        </span>
        <Printer className="w-4 h-4 text-[#F59E0B]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
          THERMAL LABEL PRINT
        </span>
      </div>
    </header>
  );
};
