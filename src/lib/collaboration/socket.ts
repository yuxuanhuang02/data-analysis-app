'use client';

import { io, Socket } from 'socket.io-client';
import { useStore } from '@/store';

class CollaborationService {
    private socket: Socket | null = null;
    public userId: string = '';
    public userName: string = '';
    private lastEmitTime = 0;
    private readonly THROTTLE_MS = 50; // Max 20Hz updates
    private currentColor: string = '#58a6ff';

    constructor() {
        // Generate a random ID and Name on startup
        this.userId = Math.random().toString(36).substr(2, 9);
        this.userName = `User_${this.userId.substr(0, 4)}`;

        // Pick a random distinctive color
        const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
        this.currentColor = colors[Math.floor(Math.random() * colors.length)];
    }

    public connect(url?: string) {
        if (this.socket) return;

        // Priority: Passed URL -> Process Environment (Vercel Prod) -> Current Hostname (LAN mode) -> Localhost
        let targetUrl = url || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

        // Only run hostname fallback if no production URL is configured
        if (!url && !process.env.NEXT_PUBLIC_SOCKET_URL && typeof window !== 'undefined') {
            targetUrl = `http://${window.location.hostname}:3001`;
        }

        console.log(`🔌 Connecting to collaboration server at: ${targetUrl}`);
        this.socket = io(targetUrl);

        this.socket.on('connect', () => {
            console.log('✅ Connected to collab server:', this.socket?.id);
            // Override user ID with the real socket ID so server disconnects map correctly
            if (this.socket) {
                this.userId = this.socket.id || '';
            }
        });

        this.socket.on('cursor_update', (data: { id: string, name: string, x: number, y: number, color: string | undefined, t?: number, v?: number }) => {
            useStore.getState().updateCursor(data.id, {
                id: data.id,
                name: data.name,
                x: data.x,
                y: data.y,
                color: (data.color || '#888') as string,
                t: data.t,
                v: data.v
            });
        });

        this.socket.on('cursor_remove', (removedId: string) => {
            useStore.getState().removeCursor(removedId);
        });

        this.socket.on('annotation_added', (ann: any) => {
            // Prevent adding our own annotations twice if we already added them locally
            const state = useStore.getState();
            if (!state.annotations.find(a => a.id === ann.id)) {
                state.addAnnotation(ann);
            }
        });

        this.socket.on('data_synced', (payload: { metadata: any[], samples: Record<string, any[]> }) => {
            console.log(`📦 Received synced data from peer.`);
            const state = useStore.getState();
            state.setAvailableSignals(payload.metadata);
            Object.keys(payload.samples).forEach(id => {
                state.setSamples(id, payload.samples[id]);
            });
        });

        this.socket.on('signals_synced', (visibleSignals: string[]) => {
            console.log(`📊 Received synced active signals from peer.`);
            useStore.setState({ visibleSignals });
        });
    }

    public trackMouse(x: number, y: number, t?: number, v?: number) {
        if (!this.socket || !this.socket.connected) return;

        const now = Date.now();
        if (now - this.lastEmitTime > this.THROTTLE_MS) {
            this.socket.emit('cursor_move', {
                id: this.userId,
                name: this.userName,
                x,
                y,
                t,
                v,
                color: this.currentColor
            });
            this.lastEmitTime = now;
        }
    }

    public broadcastAnnotation(ann: any) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('add_annotation', ann);
        }
    }

    public broadcastData(metadata: any[], samples: Record<string, any[]>) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('sync_data', { metadata, samples });
        }
    }

    public broadcastSignals(visibleSignals: string[]) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('sync_signals', visibleSignals);
        }
    }
}

export const colabService = new CollaborationService();
