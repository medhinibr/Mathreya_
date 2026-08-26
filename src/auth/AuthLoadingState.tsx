import React from 'react';
import { motion } from 'motion/react';

export const AuthLoadingState: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#FFF8F5] flex flex-col items-center justify-center p-6 text-[#4D2D22] select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center space-y-5 text-center max-w-sm"
      >
        {/* Pulsing Mathreya Brand Logo Emblem */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-[#B76A4B]/20 blur-md"
          />
          <img
            src="assets/logo.png"
            alt="Mathreya"
            className="w-24 h-24 object-contain relative z-10 filter drop-shadow-sm animate-pulse"
          />
        </div>

        <div className="space-y-1.5">
          <h2 className="font-serif text-xl font-extrabold text-[#4D2D22]">
            Mathreya Sanctuary
          </h2>
          <p className="text-xs text-[#8B756A] font-serif italic font-medium">
            Verifying your private medical shell...
          </p>
        </div>

        {/* Custom Warm Spinner */}
        <div className="flex items-center gap-1.5 pt-2">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
            className="w-2 h-2 rounded-full bg-[#B76A4B]"
          />
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
            className="w-2 h-2 rounded-full bg-[#C87958]"
          />
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
            className="w-2 h-2 rounded-full bg-[#D98767]"
          />
        </div>
      </motion.div>
    </div>
  );
};
