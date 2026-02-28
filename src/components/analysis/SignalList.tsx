'use client';

import React from 'react';
import { useStore } from '@/store';
import { Activity, Eye, EyeOff, Hash } from 'lucide-react';
import { colabService } from '@/lib/collaboration/socket';

export const SignalList: React.FC = () => {
    const availableSignals = useStore((state) => state.availableSignals);
    const visibleSignals = useStore((state) => state.visibleSignals);
    const toggleSignal = useStore((state) => state.toggleSignal);

    const handleToggle = (id: string) => {
        toggleSignal(id);

        // Wait for Zustand state to update, then broadcast the new list of visible signals
        // setTimeout is a hacky but reliable way to wait for React/Zustand batching
        setTimeout(() => {
            colabService.broadcastSignals(useStore.getState().visibleSignals);
        }, 10);
    };

    if (availableSignals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <Activity className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs">No signals discovered yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {availableSignals.map((signal) => {
                const isVisible = visibleSignals.includes(signal.id);

                return (
                    <div
                        key={signal.id}
                        onClick={() => handleToggle(signal.id)}
                        className={`
              flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all group
              ${isVisible
                                ? 'bg-blue-500/10 border-blue-500/30'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700'}
            `}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`
                p-2 rounded-lg 
                ${isVisible ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}
              `}>
                                <Hash className="w-4 h-4" />
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${isVisible ? 'text-blue-100' : 'text-slate-300'}`}>
                                    {signal.name}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">ID: {signal.id}</p>
                            </div>
                        </div>

                        <button className={`${isVisible ? 'text-blue-400' : 'text-slate-600'}`}>
                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
