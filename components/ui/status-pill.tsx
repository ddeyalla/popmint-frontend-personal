"use client";

import React from 'react';
import { Clock, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusType = 'pending' | 'active' | 'completed' | 'error';

interface StatusPillProps {
  status: StatusType;
  className?: string;
}

const statusMap = {
  pending: {
    icon: Clock,
    class: 'text-zinc-400',
    label: 'Pending'
  },
  active: {
    icon: Loader2,
    class: 'text-pm-indigo animate-spin',
    label: 'In progress'
  },
  completed: {
    icon: CheckCircle2,
    class: 'text-pm-emerald',
    label: 'Done'
  },
  error: {
    icon: AlertTriangle,
    class: 'text-red-500',
    label: 'Error'
  }
};

export function StatusPill({ status, className }: StatusPillProps) {
  const { icon: Icon, class: iconClass, label } = statusMap[status];

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
      "bg-white/50 backdrop-blur-sm border border-white/20",
      className
    )}>
      <Icon className={cn("w-3 h-3", iconClass)} />
      <span className={iconClass}>{label}</span>
    </div>
  );
}