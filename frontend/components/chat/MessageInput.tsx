import React, { useState, useCallback, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onTyping, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const emitTyping = useCallback(
    (typing: boolean) => {
      if (!onTyping) return;
      if (typing !== isTypingRef.current) {
        isTypingRef.current = typing;
        onTyping(typing);
      }
    },
    [onTyping]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    if (value.trim()) {
      emitTyping(true);

      // Debounce: clear previous timeout, set a new one to stop typing after 2s of inactivity
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        emitTyping(false);
      }, 2000);
    } else {
      // Text is empty, stop typing immediately
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      emitTyping(false);
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed && !disabled) {
      // Clear typing state before sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      emitTyping(false);

      onSend(trimmed);
      setText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 flex items-end space-x-3 shrink-0 z-10">
      <div className="flex-1 bg-white/50 dark:bg-slate-950/50 border border-slate-300/50 dark:border-slate-700/50 rounded-3xl overflow-hidden focus-within:border-blue-500/70 focus-within:bg-slate-100 dark:bg-slate-900 focus-within:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all shadow-sm">
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? 'Connecting...' : 'Message...'}
          className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 px-5 py-3 max-h-32 min-h-[46px] resize-none focus:outline-none disabled:opacity-50"
          rows={text.split('\n').length > 1 ? Math.min(text.split('\n').length, 5) : 1}
        />
      </div>
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="w-[46px] h-[46px] flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-400 hover:to-blue-500 transition-all active:scale-95 disabled:opacity-50 disabled:from-blue-600 disabled:to-blue-600 disabled:active:scale-100 shadow-md hover:shadow-lg"
      >
        <Send className="w-5 h-5 ml-1" />
      </button>
    </div>
  );
}
