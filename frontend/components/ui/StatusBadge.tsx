import React from 'react';

interface StatusBadgeProps {
  status: 'loading' | 'online' | 'offline';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (status === 'loading') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 shadow-sm backdrop-blur-sm">
        <span className="relative flex h-2 w-2 mr-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
        </span>
        Checking API...
      </span>
    );
  }

  if (status === 'online') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm backdrop-blur-sm">
        <span className="relative flex h-2 w-2 mr-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Operational
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-red-500/10 text-red-500 border border-red-500/30 shadow-sm backdrop-blur-sm">
      <span className="relative flex h-2 w-2 mr-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </span>
      Disconnected
    </span>
  );
};
