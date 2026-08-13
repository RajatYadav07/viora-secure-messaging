import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, WebSocketState, WsEvent, WsStatusUpdateEvent, WsTypingEvent } from '@/types';

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://viora-secure-messaging.onrender.com' : 'http://localhost:8000')).replace(/^http/, 'ws') + '/ws';

export interface TypingUser {
  userId: number;
  conversationId: number;
  isTyping: boolean;
}

export interface StatusUpdate {
  messageId: number;
  status: 'sent' | 'delivered' | 'read';
}

export interface PresenceUpdate {
  userId: number;
  isOnline: boolean;
  lastSeen: string | null;
}

export function useWebSocket(enabled: boolean) {
  const [connectionState, setConnectionState] = useState<WebSocketState>('disconnected');
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<StatusUpdate | null>(null);
  const [lastPresenceUpdate, setLastPresenceUpdate] = useState<PresenceUpdate | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const MAX_RECONNECTS = 3;

  const connect = useCallback(() => {
    if (!enabled) return;

    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setConnectionState('connecting');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setConnectionState('connected');
      reconnectCountRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsEvent;
        if (data.type === 'message') {
          setLastMessage(data.message);
        } else if (data.type === 'error') {
          console.error('WebSocket server error:', data.message);
        } else if (data.type === 'status_update') {
          const su = data as WsStatusUpdateEvent;
          setLastStatusUpdate({
            messageId: su.message_id,
            status: su.status,
          });
        } else if (data.type === 'presence') {
          const pu = data as any;
          setLastPresenceUpdate({
            userId: pu.user_id,
            isOnline: pu.is_online,
            lastSeen: pu.last_seen,
          });
        } else if (data.type === 'typing') {
          const te = data as WsTypingEvent;
          const key = `${te.conversation_id}-${te.user_id}`;

          // Clear any existing timeout for this user
          const existingTimeout = typingTimeoutsRef.current.get(key);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            typingTimeoutsRef.current.delete(key);
          }

          if (te.is_typing) {
            setTypingUsers((prev) => {
              // Upsert
              const filtered = prev.filter(
                (t) => !(t.conversationId === te.conversation_id && t.userId === te.user_id)
              );
              return [...filtered, { userId: te.user_id, conversationId: te.conversation_id, isTyping: true }];
            });

            // Auto-clear typing after 5 seconds (safety timeout)
            const timeout = setTimeout(() => {
              setTypingUsers((prev) =>
                prev.filter(
                  (t) => !(t.conversationId === te.conversation_id && t.userId === te.user_id)
                )
              );
              typingTimeoutsRef.current.delete(key);
            }, 5000);
            typingTimeoutsRef.current.set(key, timeout);
          } else {
            setTypingUsers((prev) =>
              prev.filter(
                (t) => !(t.conversationId === te.conversation_id && t.userId === te.user_id)
              )
            );
          }
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    ws.onclose = () => {
      setConnectionState('disconnected');
      wsRef.current = null;
      
      if (enabled && reconnectCountRef.current < MAX_RECONNECTS) {
        setConnectionState('reconnecting');
        const delay = Math.pow(2, reconnectCountRef.current) * 1000;
        reconnectCountRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket connection error', err);
      // onclose will handle reconnection
    };

    wsRef.current = ws;
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      reconnectCountRef.current = 0;
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Clear all typing timeouts
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect]);

  const sendMessage = useCallback((conversationId: number, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        conversation_id: conversationId,
        content
      }));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  const sendTyping = useCallback((conversationId: number, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        conversation_id: conversationId,
        is_typing: isTyping,
      }));
    }
  }, []);

  return { 
    sendMessage, 
    sendTyping, 
    lastMessage, 
    lastStatusUpdate, 
    lastPresenceUpdate,
    typingUsers, 
    connectionState 
  };
}
