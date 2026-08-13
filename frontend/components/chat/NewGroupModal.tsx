import React, { useState } from 'react';
import { User, Conversation } from '@/types';
import { createGroup } from '@/lib/api';
import { Users, X } from 'lucide-react';

interface NewGroupModalProps {
  contacts: User[];
  onClose: () => void;
  onSuccess: (conversation: Conversation) => void;
}

export function NewGroupModal({ contacts, onClose, onSuccess }: NewGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredContacts = contacts.filter((c) =>
    c.display_name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleContact = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Group name is required.');
      return;
    }
    if (selectedIds.size === 0) {
      setError('Select at least one contact to add.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const conv = await createGroup(groupName, Array.from(selectedIds));
      onSuccess(conv);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300/50 dark:border-slate-700/50 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl flex flex-col max-h-[85vh] scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800/50">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 tracking-wide">
            <Users className="w-4 h-4 text-blue-500" />
            <span>Create New Group</span>
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-white rounded-full hover:bg-slate-200 dark:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex flex-col overflow-hidden">
          <div className="shrink-0">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              placeholder="e.g. Weekend Plans"
              className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-950/50 border border-slate-300/50 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:bg-slate-100 dark:bg-slate-900 transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col overflow-hidden min-h-[200px]">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Select Members ({selectedIds.size})</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full px-4 py-2 mb-3 bg-white/50 dark:bg-slate-950/50 border border-slate-300/50 dark:border-slate-700/50 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:bg-slate-100 dark:bg-slate-900 transition-all shadow-sm shrink-0"
            />
            
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredContacts.length === 0 ? (
                <div className="text-xs text-slate-900 dark:text-slate-500 text-center py-4">No contacts found.</div>
              ) : (
                filteredContacts.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-all ${
                      selectedIds.has(c.id) ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-slate-200 dark:bg-slate-800 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleContact(c.id)}
                      className="hidden"
                    />
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-800 dark:text-slate-200 shrink-0">
                      {c.display_name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{c.display_name}</div>
                      <div className="text-[10px] text-slate-900 dark:text-slate-500 truncate">@{c.username}</div>
                    </div>
                    {selectedIds.has(c.id) && (
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                        <CheckIcon className="w-3 h-3" />
                      </div>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          {error && <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 shrink-0">{error}</div>}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedIds.size === 0 || !groupName.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-full shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
