'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RevealAnimationProps {
  children: React.ReactNode;
  isRevealed: boolean;
  isAnimating: boolean;
  onClick: () => void;
}

export function RevealAnimation({
  children,
  isRevealed,
  isAnimating,
  onClick,
}: RevealAnimationProps) {
  return (
    <motion.div
      className={cn(
        'relative cursor-pointer select-none rounded-lg min-h-[80px]',
        !isRevealed && 'hover:scale-[1.01] transition-transform'
      )}
      onClick={onClick}
      initial={false}
      animate={{
        filter: isRevealed ? 'blur(0px)' : 'blur(8px)',
        opacity: isRevealed ? 1 : 0.7,
        scale: isAnimating ? [1, 0.98, 1] : 1,
      }}
      transition={{
        filter: { duration: 0.5, ease: 'easeOut' },
        opacity: { duration: 0.3, ease: 'easeOut' },
        scale: { duration: 0.4, ease: 'easeInOut' },
      }}
    >
      {/* Overlay shown before reveal */}
      {!isRevealed && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg z-10"
          initial={{ opacity: 1 }}
          animate={{ opacity: isAnimating ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center pointer-events-none">
            <p className="text-sm font-medium text-purple-600 mb-1">
              Click to reveal
            </p>
            <p className="text-xs text-purple-400">✨ Your secret awaits ✨</p>
          </div>
        </motion.div>
      )}

      {/* Actual content */}
      <div className={cn(!isRevealed && 'pointer-events-none invisible')}>
        {children}
      </div>
    </motion.div>
  );
}
