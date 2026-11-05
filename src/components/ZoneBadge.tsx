import React from 'react';
import type { Zone } from '../domain/types';

interface ZoneBadgeProps {
  zone: Zone;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ZONE_CONFIG: Record<Zone, { label: string; badge: string }> = {
  str: {
    label: 'СИЛА',
    badge: 'bg-black text-yellow-400 border border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.2)]',
  },
  mid: {
    label: 'СРЕДНЯК',
    badge: 'bg-black text-yellow-200/90 border border-yellow-500/60',
  },
  vol: {
    label: 'ОБЪЁМ',
    badge: 'bg-black text-neutral-200 border border-neutral-600',
  },
};

export const ZoneBadge: React.FC<ZoneBadgeProps> = ({ zone, className = '', size = 'md' }) => {
  const config = ZONE_CONFIG[zone] || {
    label: zone.toUpperCase(),
    badge: 'bg-black text-white border border-neutral-700',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 font-bold tracking-wider',
    md: 'text-xs px-2.5 py-1 font-extrabold tracking-widest',
    lg: 'text-sm px-3.5 py-1.5 font-black tracking-widest',
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center uppercase rounded-none font-mono ${config.badge} ${sizeClasses} ${className}`}
    >
      {config.label}
    </span>
  );
};
