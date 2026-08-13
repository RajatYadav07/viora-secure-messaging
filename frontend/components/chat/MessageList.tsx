import React, { useEffect, useRef } from 'react';
import { Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { MessageSquareDashed } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  currentUserId: number;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1 bg-[#0b1120] custom-scrollbar">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
            <MessageSquareDashed className="w-8 h-8 text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-300">No messages yet</p>
            <p className="text-xs text-slate-500 mt-1">Send a message to start the conversation.</p>
          </div>
        </div>
      ) : (
        messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === currentUserId}
          />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
