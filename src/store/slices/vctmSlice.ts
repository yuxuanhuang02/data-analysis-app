import { StateCreator } from 'zustand';
import { SignalPoint } from '@/lib/vctm/engine';
import { Annotation } from './collaborationSlice';

export interface SignalMetadata {
    id: string;
    name: string;
    unit: string;
    source: string;
}

export interface ChartAnnotation {
    id: string;
    signalId: string;
    signalName: string;
    t: number;
    v: number;
    text: string;
    color: number;
}

export interface VCTMState {
    sources: string[];
    availableSignals: SignalMetadata[];
    currentSamples: Record<string, SignalPoint[]>; // signalId -> points
    visibleSignals: string[];
    globalOffset: number;
    zoomLevel: number; // 1.0 = auto-fit, > 1.0 = zoomed in
    horizontalScroll: number; // offset in ms or pixels
    annotations: Annotation[]; // For the chat/comment drawer
    chartAnnotations: ChartAnnotation[]; // For persistent dots on the plot

    setGlobalOffset: (offset: number) => void;
    addSource: (id: string) => void;
    setAvailableSignals: (signals: SignalMetadata[]) => void;
    setSamples: (signalId: string, samples: SignalPoint[]) => void;
    toggleSignal: (id: string) => void;
    setZoomLevel: (level: number) => void;
    setHorizontalScroll: (scroll: number) => void;
    addChartAnnotation: (annotation: Omit<ChartAnnotation, 'id'>) => void;
    clearChartAnnotations: () => void;
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
    chartAnnotations: [],

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
    addChartAnnotation: (ann) => set((state) => ({
        chartAnnotations: [...state.chartAnnotations, { ...ann, id: Math.random().toString(36).substring(7) }]
    })),
    clearChartAnnotations: () => set({ chartAnnotations: [] }),
});
