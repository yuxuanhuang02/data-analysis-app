'use client';

import React from 'react';
import { useStore } from '@/store';
import { MousePointer2 } from 'lucide-react';

export const RemoteCursors: React.FC = () => {
    const cursors = useStore((state) => state.cursors);

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-50">
            {Object.values(cursors).map((cursor) => (
                <div
                    key={cursor.id}
                    className="absolute transition-all duration-75 ease-linear"
                    style={{
                        left: cursor.x,
                        top: cursor.y,
                        color: cursor.color
                    }}
                >
                    <MousePointer2 className="w-5 h-5 fill-current" />
                    <div
                        className="ml-4 px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-lg"
                        style={{ backgroundColor: cursor.color }}
                    >
                        {cursor.name}
                    </div>
                </div>
            ))}
        </div>
    );
};
