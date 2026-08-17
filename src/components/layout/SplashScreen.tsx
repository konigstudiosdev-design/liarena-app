import React, { useState, useEffect } from "react";
import { cn } from "../../lib/utils";

interface SplashScreenProps {
  message: string;
  progress: number;
  isExiting: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ message, progress, isExiting }) => {
  const [fadeMessage, setFadeMessage] = useState(message);
  const [isMessageFading, setIsMessageFading] = useState(false);

  useEffect(() => {
    if (message !== fadeMessage) {
      setIsMessageFading(true);
      const timeout = setTimeout(() => {
        setFadeMessage(message);
        setIsMessageFading(false);
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [message, fadeMessage]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F8FAFC] transition-opacity duration-300 ease-in-out select-none cursor-wait",
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      <div className="flex flex-col items-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
        {/* Logo Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary blur-2xl opacity-10 animate-pulse" />
          <div className="w-28 h-28 bg-white rounded-[40px] flex items-center justify-center relative shadow-2xl shadow-primary/10 p-6 border border-slate-50">
            <img src="/logo.png" alt="Liarena Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Brand Section */}
        <div className="text-center space-y-2">
          <h1 className="text-[36px] font-bold text-slate-900 tracking-tight font-sans">
            LIARENA
          </h1>
          <p className="text-[18px] font-medium text-[#64748B] font-sans">
            Sistema Integral para Endoscopia
          </p>
        </div>

        {/* Progress Section */}
        <div className="w-64 pt-12 space-y-4">
          <div
            className={cn(
              "text-[14px] text-[#64748B] text-center font-sans transition-opacity duration-150",
              isMessageFading ? "opacity-0" : "opacity-100"
            )}
          >
            {fadeMessage}
          </div>

          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Build Info */}
      <div className="absolute bottom-10 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
        Liarena Clinical Engine • Enterprise RC 1.0
      </div>
    </div>
  );
};
