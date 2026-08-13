import React, { useState, useEffect } from 'react';
import { User, ConversationDetail, ConversationMember } from '@/types';
import { getGroup, addGroupMember, removeGroupMember, leaveGroup } from '@/lib/api';
import { Users, X, UserPlus, UserMinus, Shield, LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface GroupInfoModalProps {
  groupId: number;
  currentUser: User;
  onClose: () => void;
  onLeave: () => void;
  contacts: User[]; // Pass contacts from parent to allow adding members
}

export function GroupInfoModal({ groupId, currentUser, onClose, onLeave, contacts }: GroupInfoModalProps) {
  const [group, setGroup] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberId, setAddMemberId] = useState<number | ''>('');

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    setLoading(true);
    try {
      const data = await getGroup(groupId);
      setGroup(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberId) return;
    setActionLoading(true);
    setError(null);
    try {
      await addGroupMember(groupId, Number(addMemberId));
      await loadGroup();
      setShowAddMember(false);
      setAddMemberId('');
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await removeGroupMember(groupId, userId);
      await loadGroup();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await leaveGroup(groupId);
      onLeave(); // trigger UI refresh in parent
    } catch (err: any) {
      setError(err.message || 'Failed to leave group');
      setActionLoading(false);
    }
  };

  if (loading && !group) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="text-white text-sm">Loading group info...</div>
      </div>
    );
  }

  if (!group) return null;

  const currentMember = group.members.find(m => m.user_id === currentUser.id);
  const isAdmin = currentMember?.role === 'admin';

  // Filter contacts to only those not already in the group
  const nonMembers = contacts.filter(c => !group.members.some(m => m.user_id === c.id));

  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300/50 dark:border-slate-700/50 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl flex flex-col max-h-[85vh] scale-100 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 tracking-wide">
            <Users className="w-4 h-4 text-blue-500" />
            <span>Group Info</span>
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-white rounded-full hover:bg-slate-200 dark:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center space-y-3 py-2">
          <Avatar 
            url={null} // groups don't have avatars yet in the backend, but we prepare for it
            name={group.name || 'Group'} 
            className="w-20 h-20 text-2xl shadow-lg" 
          />
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-wide">{group.name}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{group.members.length} members</p>
          </div>
        </div>

        {error && <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}

        {isAdmin && !showAddMember && nonMembers.length > 0 && (
          <button
            onClick={() => setShowAddMember(true)}
            className="w-full py-2 bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:bg-slate-700 text-blue-400 hover:text-blue-300 text-sm font-medium rounded-xl flex items-center justify-center space-x-2 transition-all border border-slate-300/50 dark:border-slate-700/50 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        )}

        {showAddMember && (
          <form onSubmit={handleAddMember} className="bg-white/50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-300/50 dark:border-slate-700/50 space-y-4 shadow-inner">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Select Contact</label>
            <select
              value={addMemberId}
              onChange={(e) => setAddMemberId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-300/50 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500/70 shadow-sm"
            >
              <option value="" disabled>Choose contact...</option>
              {nonMembers.map(c => (
                <option key={c.id} value={c.id}>{c.display_name} (@{c.username})</option>
              ))}
            </select>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="flex-1 py-2 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !addMemberId}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-full shadow-sm disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar min-h-[150px]">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 mt-2 px-1">Members</div>
          {group.members.map(member => (
            <div key={member.user_id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-200/50 dark:bg-slate-800/50 transition-colors group">
              <div className="flex items-center space-x-3 min-w-0">
                <Avatar url={member.avatar} name={member.display_name} className="w-10 h-10 text-sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate flex items-center space-x-2">
                    <span>{member.user_id === currentUser.id ? 'You' : member.display_name}</span>
                    {member.role === 'admin' && (
                      <span title="Admin" className="flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                        <Shield className="w-2.5 h-2.5 text-emerald-400 mr-1" />
                        <span className="text-[9px] font-bold text-emerald-400 uppercase">Admin</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-900 dark:text-slate-500 truncate">@{member.username}</div>
                </div>
              </div>
              
              {isAdmin && member.user_id !== currentUser.id && (
                <button
                  onClick={() => handleRemoveMember(member.user_id)}
                  disabled={actionLoading}
                  className="p-2 text-slate-900 dark:text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 focus:opacity-100"
                  title="Remove from group"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <button
            onClick={handleLeaveGroup}
            disabled={actionLoading}
            className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold rounded-full flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Group</span>
          </button>
        </div>
        
      </div>
    </div>
  );
}
