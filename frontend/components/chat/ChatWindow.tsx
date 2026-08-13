import React, { useEffect, useState, useCallback } from 'react';
import { Conversation, Message, User, WebSocketState } from '@/types';
import { getMessages, markConversationRead } from '@/lib/api';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Shield, Phone, Video } from 'lucide-react';
import { StatusUpdate, TypingUser } from '@/hooks/useWebSocket';
import { GroupInfoModal } from './GroupInfoModal';
import { MockEncryptionModal } from './MockEncryptionModal';
import { parseUtcDate } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  sendMessage: (conversationId: number, content: string) => void;
  sendTyping: (conversationId: number, isTyping: boolean) => void;
  lastMessage: Message | null;
  lastStatusUpdate: StatusUpdate | null;
  typingUsers: TypingUser[];
  connectionState: WebSocketState;
  onConversationRead?: (conversationId: number) => void;
  contacts: User[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onBack?: () => void;
}

export function ChatWindow({
  conversation,
  currentUser,
  sendMessage,
  sendTyping,
  lastMessage,
  lastStatusUpdate,
  typingUsers,
  connectionState,
  onConversationRead,
  contacts,
  showToast,
  onBack,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);

  // Load message history and mark read on conversation open / change
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setMessages([]); // Immediately clear old messages when switching conversation
    
    getMessages(conversation.id)
      .then((history) => {
        if (mounted) {
          if (history.length > 0) {
            const sorted = history.sort((a, b) => parseUtcDate(a.created_at).getTime() - parseUtcDate(b.created_at).getTime());
            setMessages(sorted);
          } else {
            setMessages([]);
          }
        }
      })
      .catch((err) => console.error('Failed to load messages', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // Mark conversation as read when opened
    markConversationRead(conversation.id)
      .then(() => {
        onConversationRead?.(conversation.id);
      })
      .catch((err) => console.error('Failed to mark conversation as read', err));

    return () => {
      mounted = false;
    };
  }, [conversation.id]);

  // Append new incoming messages from WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.conversation_id === conversation.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === lastMessage.id)) return prev;
        return [...prev, lastMessage];
      });

      // If incoming message is from someone else, mark as read immediately
      if (lastMessage.sender_id !== currentUser.id) {
        markConversationRead(conversation.id)
          .then(() => {
            onConversationRead?.(conversation.id);
          })
          .catch((err) => console.error('Failed to mark conversation as read', err));
      }
    }
  }, [lastMessage, conversation.id, currentUser.id]);

  // Handle status updates from WebSocket
  useEffect(() => {
    if (lastStatusUpdate) {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === lastStatusUpdate.messageId) {
            return { ...msg, status: lastStatusUpdate.status };
          }
          return msg;
        })
      );
    }
  }, [lastStatusUpdate]);

  const handleSend = (content: string) => {
    sendMessage(conversation.id, content);
  };

  const handleTyping = useCallback(
    (isTyping: boolean) => {
      sendTyping(conversation.id, isTyping);
    },
    [conversation.id, sendTyping]
  );

  const title = conversation.type === 'direct' ? conversation.other_user?.display_name || 'Chat' : conversation.name || 'Group';
  const avatarLetter = title[0].toUpperCase();
  const subtitle = conversation.type === 'direct' ? `@${conversation.other_user?.username}` : `${conversation.member_count} members`;

  // Typing indicator: find users typing in this conversation (excluding self)
  const typingInThisConversation = typingUsers.filter(
    (t) => t.conversationId === conversation.id && t.userId !== currentUser.id && t.isTyping
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full bg-[#0b1120] relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] pointer-events-none"></div>

      {/* Header */}
      <div className="h-16 px-4 md:px-6 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10 sticky top-0 shadow-sm">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <Avatar 
            url={conversation.type === 'direct' ? conversation.other_user?.avatar : null} 
            name={title} 
            className="w-10 h-10 text-sm" 
          />
          <div>
            <div className="text-sm font-bold text-white flex items-center tracking-wide">
              {title}
            </div>
            {conversation.type === 'direct' && conversation.other_user && (
              <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                <span>@{conversation.other_user.username}</span>
                {conversation.other_user.is_online ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-emerald-400">Online</span>
                  </>
                ) : conversation.other_user.last_seen ? (
                  <span className="opacity-70">
                    • Last seen: {parseUtcDate(conversation.other_user.last_seen).toLocaleString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                ) : null}
              </div>
            )}
            <div className="text-xs text-slate-400 flex items-center space-x-1.5 mt-0.5">
              {typingInThisConversation.length > 0 ? (
                <span className="text-emerald-400 animate-pulse">typing...</span>
              ) : (
                <>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connectionState === 'connected'
                        ? 'bg-emerald-400'
                        : connectionState === 'connecting' || connectionState === 'reconnecting'
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                    }`}
                  />
                  <span>
                    {connectionState === 'connected'
                      ? subtitle
                      : connectionState === 'connecting'
                      ? 'Connecting...'
                      : connectionState === 'reconnecting'
                      ? 'Reconnecting...'
                      : 'Disconnected'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 md:space-x-3">
          <button onClick={() => showToast('Voice calls are coming soon.', 'info')} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
            <Phone className="w-4 h-4" />
          </button>
          <button onClick={() => showToast('Video calls are coming soon.', 'info')} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
            <Video className="w-4 h-4" />
          </button>
          
          {conversation.type === 'group' && (
            <button
              onClick={() => setShowGroupInfo(true)}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-full transition-all border border-slate-700/50 shadow-sm"
            >
              Group Info
            </button>
          )}
          <div onClick={() => setShowEncryptionModal(true)} className="p-2 bg-slate-800/80 rounded-full text-slate-400 border border-slate-700/50 cursor-pointer hover:bg-slate-700 hover:text-white transition-all shadow-sm" title="End-to-End Encrypted">
            <Shield className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Messages */}
      {loading ? (
        <div className="flex-1 min-h-0 flex items-center justify-center bg-[#0b1120]">
          <span className="text-sm text-slate-500 animate-pulse">Loading messages...</span>
        </div>
      ) : (
        <MessageList messages={messages} currentUserId={currentUser.id} />
      )}

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        disabled={connectionState !== 'connected'}
      />

      {showGroupInfo && (
        <GroupInfoModal
          groupId={conversation.id}
          currentUser={currentUser}
          contacts={contacts}
          onClose={() => setShowGroupInfo(false)}
          onLeave={() => window.location.reload()}
        />
      )}

      {showEncryptionModal && (
        <MockEncryptionModal onClose={() => setShowEncryptionModal(false)} />
      )}
    </div>
  );
}
