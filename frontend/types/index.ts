export interface HealthResponse {
  status: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface User {
  id: number;
  username: string;
  phone: string | null;
  display_name: string;
  avatar: string | null;
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
}

export interface RegisterPayload {
  username: string;
  phone?: string;
  display_name: string;
}

export interface LoginPayload {
  username: string;
}

export interface VerifyOtpPayload {
  username: string;
  otp: string;
}

export interface AuthMessageResponse {
  message: string;
  verification_required: boolean;
}

export interface MessagePreview {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  type: 'direct' | 'group';
  name: string | null;
  other_user: User | null;
  member_count: number;
  latest_message: MessagePreview | null;
  latest_message_timestamp: string | null;
  unread_count: number;
  updated_at: string;
  created_at: string;
}

export interface ConversationMember {
  user_id: number;
  username: string;
  display_name: string;
  avatar: string | null;
  is_online: boolean;
  last_seen: string | null;
  role: 'member' | 'admin';
  joined_at: string;
}

export interface ConversationDetail {
  id: number;
  type: 'direct' | 'group';
  name: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  other_user: User | null;
  members: ConversationMember[];
}

export interface SearchResponse {
  contacts: User[];
  conversations: Conversation[];
}

export interface MessageSender {
  id: number;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender: MessageSender;
  content: string;
  reply_to_id: number | null;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
}

export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WsMessageEvent {
  type: 'message';
  message: Message;
}

export interface WsErrorEvent {
  type: 'error';
  code: string;
  message: string;
}

export interface WsTypingEvent {
  type: 'typing';
  conversation_id: number;
  user_id: number;
  is_typing: boolean;
}

export interface WsStatusUpdateEvent {
  type: 'status_update';
  message_id: number;
  status: 'sent' | 'delivered' | 'read';
}

export interface WsPresenceEvent {
  type: 'presence';
  user_id: number;
  is_online: boolean;
  last_seen: string | null;
}

export type WsEvent = WsMessageEvent | WsErrorEvent | WsTypingEvent | WsStatusUpdateEvent | WsPresenceEvent;

