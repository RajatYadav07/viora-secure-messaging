import {
  AuthMessageResponse,
  Conversation,
  ConversationDetail,
  HealthResponse,
  LoginPayload,
  RegisterPayload,
  SearchResponse,
  User,
  VerifyOtpPayload,
  Message,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return {} as T;
  }
  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.detail || data.message || `HTTP error! status: ${res.status}`;
    throw new Error(errorMsg);
  }
  return data as T;
}

export async function fetchHealthStatus(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/health`, {
    cache: 'no-store',
  });
  return handleResponse<HealthResponse>(res);
}

// --- Auth APIs ---
export async function register(payload: RegisterPayload): Promise<AuthMessageResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  return handleResponse<AuthMessageResponse>(res);
}

export async function login(payload: LoginPayload): Promise<AuthMessageResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  return handleResponse<AuthMessageResponse>(res);
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  return handleResponse<User>(res);
}

export async function logout(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ message: string }>(res);
}

export async function getMe(): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  });
  return handleResponse<User>(res);
}

// --- Contacts APIs ---
export async function getContacts(): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/api/contacts`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  });
  return handleResponse<User[]>(res);
}

export async function addContact(username: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
    credentials: 'include',
  });
  return handleResponse<User>(res);
}

export async function deleteContact(contact_user_id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/contacts/${contact_user_id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<void>(res);
}

export async function updateProfile(display_name: string, avatar?: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name, avatar: avatar || null }),
    credentials: 'include',
  });
  return handleResponse<User>(res);
}

// --- Conversations APIs ---
export async function getConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE_URL}/api/conversations`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  });
  return handleResponse<Conversation[]>(res);
}

export async function createDirectConversation(user_id: number): Promise<Conversation> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/direct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
    credentials: 'include',
  });
  return handleResponse<Conversation>(res);
}

export async function getConversation(conversation_id: number): Promise<ConversationDetail> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/${conversation_id}`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  });
  return handleResponse<ConversationDetail>(res);
}

export async function searchConversations(query: string): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  });
  return handleResponse<SearchResponse>(res);
}

// --- Groups APIs ---
export async function createGroup(name: string, member_ids: number[]): Promise<Conversation> {
  const res = await fetch(`${API_BASE_URL}/api/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, member_ids }),
    credentials: 'include',
  });
  return handleResponse<Conversation>(res);
}

export async function addGroupMember(group_id: number, user_id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/groups/${group_id}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
    credentials: 'include',
  });
  return handleResponse<{ message: string }>(res);
}

export async function removeGroupMember(group_id: number, user_id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/groups/${group_id}/members/${user_id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<{ message: string }>(res);
}

export async function leaveGroup(group_id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/groups/${group_id}/leave`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ message: string }>(res);
}

export async function getGroup(group_id: number): Promise<ConversationDetail> {
  const res = await fetch(`${API_BASE_URL}/api/groups/${group_id}`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  });
  return handleResponse<ConversationDetail>(res);
}



export async function getMessages(conversationId: number, limit?: number, beforeId?: number): Promise<Message[]> {
  let url = `${API_BASE_URL}/api/conversations/${conversationId}/messages?limit=${limit || 50}`;
  if (beforeId) url += `&before_id=${beforeId}`;
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  return handleResponse<Message[]>(res);
}

export async function markConversationRead(conversationId: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/read`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ message: string }>(res);
}

