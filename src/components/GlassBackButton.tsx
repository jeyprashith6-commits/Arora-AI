import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { triggerHaptic } from '../engines/hapticsEngine';

interface GlassBackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export const GlassBackButton: React.FC<GlassBackButtonProps> = ({
  onClick,
  label = 'Back',
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic('tap');
        onClick();
      }}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-950/92 hover:bg-black text-white border border-white/20 shadow-[0_8px_22px_-8px_rgba(0,0,0,0.65)] holo-blur text-xs font-semibold glass-press min-h-[38px] whitespace-nowrap shrink-0 ${className}`}
    >
      <ArrowLeft className="w-3.5 h-3.5 text-sky-300" />
      <span>{label}</span>
    </button>
  );
};
