import { StateCreator } from 'zustand';

export interface RemoteCursor {
    id: string;
    name: string;
    x: number;
    y: number;
    color: string;
    t?: number;
    v?: number;
}

export interface Annotation {
    id: string;
    timestamp: number;
    text: string;
    userId: string;
    userName: string;
}

export interface CollaborationState {
    cursors: Record<string, RemoteCursor>;
    annotations: Annotation[];
    updateCursor: (id: string, cursor: Partial<RemoteCursor>) => void;
    removeCursor: (id: string) => void;
    addAnnotation: (annotation: Annotation) => void;
}

export const createCollaborationSlice: StateCreator<CollaborationState> = (set) => ({
    cursors: {},
    annotations: [],
    updateCursor: (id, cursor) => set((state) => ({
        cursors: {
            ...state.cursors,
            [id]: { ...(state.cursors[id] || { id, name: 'Anonymous', x: 0, y: 0, color: '#58a6ff' }), ...cursor }
        }
    })),
    removeCursor: (id) => set((state) => {
        const newCursors = { ...state.cursors };
        delete newCursors[id];
        return { cursors: newCursors };
    }),
    addAnnotation: (annotation) => set((state) => ({
        annotations: [...state.annotations, annotation]
    })),
});
