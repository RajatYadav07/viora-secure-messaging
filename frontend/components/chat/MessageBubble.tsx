import React from 'react';
import { Message } from '@/types';
import { Check, CheckCheck } from 'lucide-react';
import { parseUtcDate } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

function StatusIndicator({ status }: { status?: string }) {
  if (!status) return null;

  if (status === 'read') {
    return <CheckCheck className="w-3.5 h-3.5 text-blue-600 dark:text-[#53BDEB] inline-block ml-1.5" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 inline-block ml-1.5" />;
  }
  // "sent"
  return <Check className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 inline-block ml-1.5" />;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const timeString = parseUtcDate(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 flex flex-col shadow-md transition-all relative group-hover:shadow-lg ${
          isOwn
            ? 'bg-[#DCF8C6] dark:bg-[#005C4B] text-slate-900 dark:text-white rounded-2xl rounded-br-sm'
            : 'bg-slate-200/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-slate-100 rounded-2xl rounded-bl-sm'
        }`}
      >
        {!isOwn && (
          <span className="text-[11px] font-bold tracking-wide text-blue-400 mb-0.5">
            {message.sender.display_name}
          </span>
        )}
        <span className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{message.content}</span>
        <div
          className={`text-[10px] mt-1.5 flex items-center justify-end font-medium ${
            isOwn ? 'text-slate-600 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {timeString}
          {isOwn && <StatusIndicator status={message.status} />}
        </div>
      </div>
    </div>
  );
}
