import React, { useState } from 'react';
import { User } from '@/types';
import { updateProfile } from '@/lib/api';
import { Settings, X, User as UserIcon, Lock, Bell, Palette, Smartphone, Image as ImageIcon } from 'lucide-react';

interface SettingsModalProps {
  currentUser: User;
  onClose: () => void;
  onProfileUpdated: (user: User) => void;
  showToast: (msg: string, type?: 'success'|'error'|'info') => void;
}

type TabType = 'profile' | 'privacy' | 'notifications' | 'appearance' | 'linked';

export function SettingsModal({ currentUser, onClose, onProfileUpdated, showToast }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [displayName, setDisplayName] = useState(currentUser.display_name);
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await updateProfile(displayName, avatar);
      onProfileUpdated(updated);
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'linked', label: 'Linked Devices', icon: Smartphone },
  ];

  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300/50 dark:border-slate-700/50 rounded-2xl w-full max-w-4xl h-[75vh] max-h-[800px] flex overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        
        {/* Sidebar */}
        <div className="w-64 bg-white/80 dark:bg-slate-950/80 border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center space-x-3">
            <Settings className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-slate-900 dark:text-slate-100 tracking-wide">Settings</span>
          </div>
          <div className="p-2 space-y-1 flex-1 overflow-y-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600/10 text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:bg-slate-800/50 hover:text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900 relative">
          <button onClick={onClose} className="absolute top-5 right-5 p-2 text-slate-600 dark:text-slate-400 hover:text-white rounded-full hover:bg-slate-200 dark:bg-slate-800 transition-colors z-10">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            {activeTab === 'profile' && (
              <div className="max-w-md">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-8 tracking-wide">Edit Profile</h2>
                
                <form onSubmit={handleSaveProfile} className="space-y-8">
                  <div className="flex items-center space-x-6">
                    <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-300/50 dark:border-slate-700/50 shadow-md">
                      {avatar ? (
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold text-slate-600 dark:text-slate-400">{displayName[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Avatar URL</label>
                      <div className="flex items-center bg-white/50 dark:bg-slate-950/50 border border-slate-300/50 dark:border-slate-700/50 rounded-xl focus-within:border-blue-500/70 focus-within:bg-slate-100 dark:bg-slate-900 transition-all overflow-hidden shadow-sm">
                        <div className="pl-4 text-slate-900 dark:text-slate-500"><ImageIcon className="w-4 h-4" /></div>
                        <input
                          type="url"
                          value={avatar}
                          onChange={(e) => setAvatar(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 px-3 py-3 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-900 dark:text-slate-500 mt-2">Paste a public image URL to update your avatar.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      placeholder="Your name"
                      className="w-full px-4 py-3 bg-white/50 dark:bg-slate-950/50 border border-slate-300/50 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:bg-slate-100 dark:bg-slate-900 transition-all shadow-sm"
                    />
                  </div>

                  <div className="pt-6 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !displayName.trim()}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-full font-semibold shadow-sm transition-all disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab !== 'profile' && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-5">
                <div className="w-20 h-20 bg-slate-200/30 dark:bg-slate-800/30 rounded-full flex items-center justify-center text-slate-900 dark:text-slate-500 border border-slate-300/50 dark:border-slate-700/50">
                  {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Settings, { className: "w-8 h-8" })}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{tabs.find(t => t.id === activeTab)?.label}</h2>
                  <p className="text-sm text-slate-900 dark:text-slate-500 max-w-xs">
                    This section is currently under construction. More settings will be available soon.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
