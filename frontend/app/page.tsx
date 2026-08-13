'use client';

import { useEffect, useState } from 'react';
import {
  addContact,
  createDirectConversation,
  deleteContact,
  fetchHealthStatus,
  getContacts,
  getConversations,
  getMe,
  login,
  logout,
  register,
  searchConversations,
  verifyOtp,
} from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { NewGroupModal } from '@/components/chat/NewGroupModal';
import { Avatar } from '@/components/ui/Avatar';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { Toast, ToastType } from '@/components/ui/Toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { parseUtcDate } from '@/lib/utils';
import { Conversation, User } from '@/types';
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react';

export default function Home() {
  const [health, setHealth] = useState<'loading' | 'online' | 'offline'>('loading');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Auth form states
  const [activeAuthTab, setActiveAuthTab] = useState<'register' | 'login'>('register');
  const [authStep, setAuthStep] = useState<'input' | 'otp'>('input');
  
  const [username, setUsername] = useState('alice');
  const [phone, setPhone] = useState('+911234567890');
  const [displayName, setDisplayName] = useState('Alice');
  const [otp, setOtp] = useState('123456');

  // Main UI states (Post-Auth)
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'contacts'>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [addContactUsername, setAddContactUsername] = useState('');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = (msg: string, type: ToastType = 'info') => {
    setToast({ message: msg, type });
  };
  
  const [loading, setLoading] = useState(false);

  // WebSocket
  const { 
    sendMessage, 
    sendTyping, 
    lastMessage, 
    lastStatusUpdate,
    lastPresenceUpdate,
    typingUsers, 
    connectionState 
  } = useWebSocket(!!currentUser);

  useEffect(() => {
    if (!lastPresenceUpdate) return;
    setContacts(prev => prev.map(c => 
      c.id === lastPresenceUpdate.userId 
        ? { ...c, is_online: lastPresenceUpdate.isOnline, last_seen: lastPresenceUpdate.lastSeen } 
        : c
    ));
    setConversations(prev => prev.map(conv => {
      if (conv.type === 'direct' && conv.other_user?.id === lastPresenceUpdate.userId) {
        return {
          ...conv,
          other_user: {
            ...conv.other_user,
            is_online: lastPresenceUpdate.isOnline,
            last_seen: lastPresenceUpdate.lastSeen
          }
        };
      }
      return conv;
    }));
  }, [lastPresenceUpdate]);


  useEffect(() => {
    fetchHealthStatus()
      .then((data) => {
        if (data.status === 'ok') setHealth('online');
        else setHealth('offline');
      })
      .catch(() => setHealth('offline'));

    getMe()
      .then((user) => {
        setCurrentUser(user);
        loadDashboardData();
      })
      .catch(() => {
        setCurrentUser(null);
      });
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [convs, conts] = await Promise.all([getConversations(), getContacts()]);
      setConversations(convs);
      setContacts(conts);
    } catch (err: any) {
      showToast(err.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // When a conversation is marked as read, zero out its unread count in sidebar
  const handleConversationRead = (conversationId: number) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      )
    );
  };

  // When a new WS message arrives for a conversation that is NOT currently selected,
  // increment that conversation's unread_count in the sidebar.
  useEffect(() => {
    if (!lastMessage || !currentUser) return;
    if (lastMessage.sender_id === currentUser.id) return;
    if (selectedConversation && selectedConversation.id === lastMessage.conversation_id) return;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === lastMessage.conversation_id
          ? { ...c, unread_count: (c.unread_count || 0) + 1 }
          : c
      )
    );
  }, [lastMessage, currentUser, selectedConversation]);

  // Auth Handlers
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await register({
        username,
        phone: phone || undefined,
        display_name: displayName,
      });
      showToast(`${res.message}! Enter OTP '123456' to complete registration.`, 'info');
      setAuthStep('otp');
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ username });
      showToast(`${res.message}! Enter OTP '123456' to login.`, 'info');
      setAuthStep('otp');
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await verifyOtp({ username, otp });
      setCurrentUser(user);
      showToast(`Authenticated successfully as @${user.username}!`, 'success');
      setAuthStep('input');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'OTP verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      setCurrentUser(null);
      setConversations([]);
      setContacts([]);
      setSelectedConversation(null);
      showToast('Logged out successfully.', 'info');
      setAuthStep('input');
    } catch (err: any) {
      showToast(err.message || 'Logout failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Contact & Conversation Handlers
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addContactUsername.trim()) return;
    try {
      const newContact = await addContact(addContactUsername);
      setContacts((prev) => [...prev, newContact]);
      setAddContactUsername('');
      setShowAddContactModal(false);
      showToast(`Added @${newContact.username} to contacts!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add contact', 'error');
    }
  };

  const handleDeleteContact = async (contactUserId: number) => {
    try {
      await deleteContact(contactUserId);
      setContacts((prev) => prev.filter((c) => c.id !== contactUserId));
      showToast('Contact removed.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete contact', 'error');
    }
  };

  const handleStartDirectChat = async (targetUserId: number) => {
    try {
      const conv = await createDirectConversation(targetUserId);
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== conv.id);
        return [conv, ...filtered];
      });
      setSelectedConversation(conv);
      setSidebarTab('chats');
    } catch (err: any) {
      showToast(err.message || 'Failed to create conversation', 'error');
    }
  };

  const handleGroupCreated = (conv: Conversation) => {
    setConversations((prev) => [conv, ...prev]);
    setSelectedConversation(conv);
    setShowNewGroupModal(false);
    setSidebarTab('chats');
    showToast(`Group "${conv.name}" created!`, 'success');
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      loadDashboardData();
      return;
    }
    try {
      const results = await searchConversations(q);
      setConversations(results.conversations);
      setContacts(results.contacts);
    } catch (err: any) {
      showToast(err.message || 'Search failed', 'error');
    }
  };

  return (
    <main className="flex-1 flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-sm border border-blue-400/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide text-slate-100">Viora</h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <StatusBadge status={health} />
          {currentUser && (
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      {!currentUser ? (
        /* Pre-Auth Page */
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0b1120] to-[#0b1120] relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]"></div>
          
          <div className="mb-8 flex flex-col items-center space-y-3 relative z-10">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 border border-blue-400/20">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-wide text-white">Viora</h1>
            <p className="text-sm font-medium text-blue-400/80 tracking-wide uppercase">Secure, real-time messaging</p>
          </div>

          <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl space-y-8 relative z-10">

            {/* Auth Tabs */}
            {authStep === 'input' && (
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
                <button
                  onClick={() => { setActiveAuthTab('register'); setToast(null); }}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                    activeAuthTab === 'register' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
                </button>
                <button
                  onClick={() => { setActiveAuthTab('login'); setToast(null); }}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                    activeAuthTab === 'login' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Login</span>
                </button>
              </div>
            )}

            {/* Auth Forms */}
            {authStep === 'input' ? (
              activeAuthTab === 'register' ? (
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Username *</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="e.g. alice"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Display Name *</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      placeholder="e.g. Alice"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Phone (Optional)</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+911234567890"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Register (Send Mock OTP)'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLoginSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Username *</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="e.g. alice"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Login (Send Mock OTP)'}
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleVerifyOtpSubmit} className="space-y-3">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                  Use fixed test code <code className="font-bold text-white bg-blue-600/30 px-1.5 py-0.5 rounded">123456</code>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">6-Digit OTP *</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-center tracking-widest text-emerald-400 text-base focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setAuthStep('input')}
                    className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      ) : (
        /* Post-Auth Viora Interface */
        <div className="flex-1 flex overflow-hidden relative">
          {/* Viora Sidebar */}
          <aside className={`w-full md:w-[340px] lg:w-96 border-r border-slate-800/50 bg-[#0b1120] flex flex-col shrink-0 transition-all ${selectedConversation ? 'hidden md:flex' : 'flex'} shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-20`}>
            
            {/* User Profile Summary */}
            <div onClick={() => setShowSettingsModal(true)} className="p-5 border-b border-slate-800/50 flex items-center justify-between hover:bg-slate-800/30 cursor-pointer transition-colors group">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-white text-base shadow-sm ring-2 ring-slate-800/50 group-hover:ring-blue-500/50 transition-all">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.display_name[0].toUpperCase()
                  )}
                </div>
                <div className="text-left leading-tight">
                  <div className="text-sm font-bold text-slate-100 tracking-wide">{currentUser.display_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">@{currentUser.username}</div>
                </div>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" title="Online" />
            </div>

            {/* Stories Placeholder */}
            <div onClick={() => showToast('Stories are coming soon.', 'info')} className="px-4 py-3 border-b border-slate-800 flex items-center space-x-3 hover:bg-slate-800/50 cursor-pointer transition-colors bg-slate-950/30">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 p-0.5">
                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-400 border border-slate-700">
                  +
                </div>
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Your Story</div>
                <div className="text-[11px] text-slate-400">Add to your story</div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-slate-800/50 bg-[#0b1120]">
              <div className="relative group">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 transition-colors group-focus-within:text-blue-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search chats & contacts..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/50 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:bg-slate-900 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">Filter</span>
              <div className="flex bg-slate-900 rounded-lg border border-slate-800 p-0.5">
                <button onClick={() => setShowUnreadOnly(false)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!showUnreadOnly ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>All</button>
                <button onClick={() => setShowUnreadOnly(true)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${showUnreadOnly ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Unread</button>
              </div>
            </div>

            {/* Sidebar Navigation Tabs */}
            <div className="flex border-b border-slate-800/50 text-sm font-semibold bg-[#0b1120]">
              <button
                onClick={() => setSidebarTab('chats')}
                className={`flex-1 py-3.5 border-b-2 transition-all flex items-center justify-center space-x-2 ${
                  sidebarTab === 'chats' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chats ({conversations.length})</span>
              </button>
              <button
                onClick={() => setSidebarTab('contacts')}
                className={`flex-1 py-3.5 border-b-2 transition-all flex items-center justify-center space-x-2 ${
                  sidebarTab === 'contacts' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Contacts ({contacts.length})</span>
              </button>
            </div>

            {/* Actions */}
            <div className="p-2 border-b border-slate-800/60 flex space-x-2">
              <button
                onClick={() => setShowAddContactModal(true)}
                className="flex-1 py-1.5 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs rounded-lg flex items-center justify-center space-x-1.5 transition-all border border-slate-700/50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Contact</span>
              </button>
              <button
                onClick={() => setShowNewGroupModal(true)}
                className="flex-1 py-1.5 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs rounded-lg flex items-center justify-center space-x-1.5 transition-all border border-slate-700/50"
              >
                <UsersRound className="w-3.5 h-3.5" />
                <span>Group</span>
              </button>
            </div>

            {/* List View */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-sm font-medium text-slate-500 animate-pulse">Loading...</div>
              ) : sidebarTab === 'chats' ? (
                (showUnreadOnly ? conversations.filter(c => c.unread_count && c.unread_count > 0) : conversations).length === 0 ? (
                  <div className="p-10 flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-800/30 flex items-center justify-center border border-slate-700/30">
                      <MessageSquare className="w-8 h-8 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-300">No conversations</p>
                      <p className="text-xs text-slate-500 mt-1">Start a chat from your contacts.</p>
                    </div>
                  </div>
                ) : (
                  (showUnreadOnly ? conversations.filter(c => c.unread_count && c.unread_count > 0) : conversations).map((conv) => {
                    const title = conv.type === 'direct' ? conv.other_user?.display_name || 'Direct Chat' : conv.name || 'Group';
                    const subtitle = conv.latest_message ? conv.latest_message.content : 'No messages yet';
                    const isSelected = selectedConversation?.id === conv.id;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={`p-4 cursor-pointer transition-all flex items-center space-x-4 text-left border-b border-slate-800/30 ${
                          isSelected ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : 'hover:bg-slate-800/30 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <Avatar 
                            url={conv.type === 'direct' ? conv.other_user?.avatar : null} 
                            name={title} 
                            className="w-12 h-12 text-lg" 
                          />
                          {conv.type === 'direct' && conv.other_user?.is_online && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0b1120] z-10" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-slate-100 truncate tracking-wide">{title}</span>
                            <span className={`text-[11px] font-medium ${conv.unread_count > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                              {parseUtcDate(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate pr-2 ${conv.unread_count > 0 ? 'text-slate-200 font-medium' : 'text-slate-500'}`}>{subtitle}</p>
                            {conv.unread_count > 0 && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold shadow-sm">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              ) : contacts.length === 0 ? (
                <div className="p-10 flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-800/30 flex items-center justify-center border border-slate-700/30">
                    <Users className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300">No contacts</p>
                    <p className="text-xs text-slate-500 mt-1">Add contacts to start chatting.</p>
                  </div>
                </div>
              ) : (
                contacts.map((contact) => (
                  <div key={contact.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-all text-left border-b border-slate-800/30 group">
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar url={contact.avatar} name={contact.display_name} className="w-11 h-11 text-md" />
                        {contact.is_online && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0b1120] z-10" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-semibold text-slate-200 truncate">{contact.display_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">
                          @{contact.username}
                          {!contact.is_online && contact.last_seen && (
                            <span className="ml-2 opacity-60 font-normal">
                              • Last seen: {parseUtcDate(contact.last_seen).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartDirectChat(contact.id)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors"
                        title="Start Direct Chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                        title="Remove Contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Chat Preview Placeholder Pane */}
          <section className={`flex-1 flex-col bg-slate-950 overflow-hidden min-h-0 ${selectedConversation ? 'flex' : 'hidden md:flex items-center justify-center text-center'}`}>
            {selectedConversation ? (
              <ChatWindow
                conversation={selectedConversation}
                currentUser={currentUser}
                sendMessage={sendMessage}
                sendTyping={sendTyping}
                lastMessage={lastMessage}
                lastStatusUpdate={lastStatusUpdate}
                typingUsers={typingUsers}
                connectionState={connectionState}
                onConversationRead={handleConversationRead}
                contacts={contacts}
                showToast={showToast}
                onBack={() => setSelectedConversation(null)}
              />
            ) : (
              <div className="space-y-4 text-slate-500 max-w-sm flex flex-col items-center animate-in fade-in duration-500">
                <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 shadow-inner">
                  <MessageSquare className="w-10 h-10 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-200">Your Messages</h3>
                  <p className="text-sm text-slate-500 mt-2">Send private photos and messages to a friend or group.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 text-left shadow-2xl">
            <h3 className="text-sm font-bold text-white">Add New Contact</h3>
            <form onSubmit={handleAddContact} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  value={addContactUsername}
                  onChange={(e) => setAddContactUsername(e.target.value)}
                  required
                  placeholder="e.g. bob"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium"
                >
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {showNewGroupModal && (
        <NewGroupModal
          contacts={contacts}
          onClose={() => setShowNewGroupModal(false)}
          onSuccess={handleGroupCreated}
        />
      )}

      {showSettingsModal && currentUser && (
        <SettingsModal
          currentUser={currentUser}
          onClose={() => setShowSettingsModal(false)}
          onProfileUpdated={(updated) => setCurrentUser(updated)}
          showToast={showToast}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}
