import { StateCreator } from 'zustand';
import { SignalPoint } from '@/lib/vctm/engine';
import { Annotation } from './collaborationSlice';

export interface SignalMetadata {
    id: string;
    name: string;
    unit: string;
    source: string;
}

export interface VCTMState {
    sources: string[];
    availableSignals: SignalMetadata[];
    currentSamples: Record<string, SignalPoint[]>; // signalId -> points
    visibleSignals: string[];
    globalOffset: number;
    zoomLevel: number; // 1.0 = auto-fit, > 1.0 = zoomed in
    horizontalScroll: number; // offset in ms or pixels
    annotations: Annotation[];

    setGlobalOffset: (offset: number) => void;
    addSource: (id: string) => void;
    setAvailableSignals: (signals: SignalMetadata[]) => void;
    setSamples: (signalId: string, samples: SignalPoint[]) => void;
    toggleSignal: (id: string) => void;
    setZoomLevel: (level: number) => void;
    setHorizontalScroll: (scroll: number) => void;
}

export const createVCTMSlice: StateCreator<VCTMState> = (set) => ({
    sources: [],
    availableSignals: [],
    currentSamples: {},
    visibleSignals: [],
    globalOffset: 0,
    zoomLevel: 1.0,
    horizontalScroll: 0,
    annotations: [],

    setGlobalOffset: (offset) => set({ globalOffset: offset }),
    addSource: (id) => set((state) => ({
        sources: state.sources.includes(id) ? state.sources : [...state.sources, id]
    })),
    setAvailableSignals: (signals) => set({ availableSignals: signals }),
    setSamples: (signalId, samples) => set((state) => ({
        currentSamples: { ...state.currentSamples, [signalId]: samples }
    })),
    toggleSignal: (id) => set((state) => ({
        visibleSignals: state.visibleSignals.includes(id)
            ? state.visibleSignals.filter((s) => s !== id)
            : [...state.visibleSignals, id],
    })),
    setZoomLevel: (level) => set({ zoomLevel: level }),
    setHorizontalScroll: (scroll) => set({ horizontalScroll: scroll }),
});
