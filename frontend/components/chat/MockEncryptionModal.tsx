import React from 'react';
import { Shield, X, Lock } from 'lucide-react';

interface MockEncryptionModalProps {
  onClose: () => void;
}

export function MockEncryptionModal({ onClose }: MockEncryptionModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center text-center space-y-4 pt-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <Lock className="w-8 h-8" />
          </div>
          
          <div>
            <h2 className="text-lg font-bold text-white mb-2">End-to-end encryption</h2>
            <p className="text-sm text-slate-400">
              This is a simulated safety number for demonstration purposes. In a real Signal implementation, this verifies that your messages and calls are end-to-end encrypted.
            </p>
          </div>
          
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 w-full mt-4 flex items-center justify-center">
            <code className="text-sm tracking-[0.2em] font-mono text-emerald-400 font-bold">
              05123 48192 18451 98234
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
