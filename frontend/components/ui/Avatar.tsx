import React, { useState } from 'react';

interface AvatarProps {
  url?: string | null;
  name: string;
  className?: string; // e.g. "w-12 h-12 text-sm"
}

export function Avatar({ url, name, className = 'w-10 h-10 text-sm' }: AvatarProps) {
  const [error, setError] = useState(false);
  
  const letter = name ? name[0].toUpperCase() : '?';

  if (url && !error) {
    return (
      <div className={`relative rounded-full overflow-hidden shrink-0 ${className}`}>
        <img 
          src={url} 
          alt={name} 
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${className}`}>
      {letter}
    </div>
  );
}
