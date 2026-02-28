'use client';

import React, { useState, useCallback } from 'react';
import * as Comlink from 'comlink';
import { useStore } from '@/store';
import { StorageService } from '@/lib/storage';
import { colabService } from '@/lib/collaboration/socket';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';

export const FileUploader: React.FC = () => {
    const [isParsing, setIsParsing] = useState(false);
    const [isFromCache, setIsFromCache] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFile, setLastFile] = useState<string | null>(null);

    // Manual Column Mapping State
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [selectedTimeColumn, setSelectedTimeColumn] = useState<string>('');

    const addSource = useStore((state) => state.addSource);
    const setAvailableSignals = useStore((state) => state.setAvailableSignals);
    const setSamples = useStore((state) => state.setSamples);
    const setGlobalOffset = useStore((state) => state.setGlobalOffset);

    const onFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setIsFromCache(false);
        setError(null);
        setLastFile(file.name);

        try {
            const cacheKey = StorageService.generateKey(file);
            const cached = await StorageService.getCachedMetadata(cacheKey);

            if (cached) {
                console.log('🚀 Cache Hit! Loading from IndexedDB:', cached);
                setIsFromCache(true);
                addSource(file.name);
                setAvailableSignals(cached.metadata.signalMetadata || []);
                if (cached.metadata.mappedSamples) {
                    cached.metadata.mappedSamples.forEach((ms: any, idx: number) => {
                        setSamples(ms.id, ms.data);
                        if (idx === 0) {
                            useStore.getState().toggleSignal(ms.id);
                        }
                    });

                    // Broadcast cached data to other peers
                    setTimeout(() => {
                        const samplesMap: Record<string, any[]> = {};
                        cached.metadata.mappedSamples.forEach((ms: any) => {
                            samplesMap[ms.id] = ms.data;
                        });
                        console.log('📡 Broadcasting cached dataset to peers...');
                        colabService.broadcastData(cached.metadata.signalMetadata || [], samplesMap);
                        colabService.broadcastSignals(useStore.getState().visibleSignals);
                    }, 100);
                }
                setGlobalOffset(cached.metadata.simulatedOffset || 0);
                setIsParsing(false);
                return;
            }

            // 1. Initialize Worker
            const worker = new Worker(new URL('../../lib/workers/parser.worker.ts', import.meta.url));
            const workerApi = Comlink.wrap<any>(worker);

            // 2. Fetch Headers first to allow manual mapping
            const fileHeaders = await workerApi.getHeaders(await file.arrayBuffer(), file.name) as string[];
            if (fileHeaders && fileHeaders.length > 0) {
                setHeaders(fileHeaders);

                // Try to guess a good default time column
                const tKeys = ['time', 'timestamp', 't', 'ms', 'μs', 'sec'];
                const bestGuess = fileHeaders.find(h => tKeys.some(k => h.toLowerCase().includes(k))) || fileHeaders[0];
                setSelectedTimeColumn(bestGuess);

                setPendingFile(file);
                setIsParsing(false);
            } else {
                throw new Error("No columns found in file.");
            }

            worker.terminate();

        } catch (err: any) {
            console.error('Initial header extraction failed:', err);
            setError(err.message || 'Failed to read file headers');
            setIsParsing(false);
        }
    }, [addSource, setAvailableSignals, setSamples, setGlobalOffset]);

    const executeParse = async (file: File, timeColumnOverride: string) => {
        setIsParsing(true);
        setHeaders([]); // Hide UI

        try {
            const buffer = await file.arrayBuffer();
            const worker = new Worker(new URL('../../lib/workers/parser.worker.ts', import.meta.url));
            const workerApi = Comlink.wrap<any>(worker);

            // Fetch parsed data using the specific timestamp column mapping
            const result = await workerApi.parseTable(Comlink.transfer(buffer, [buffer]), file.name, timeColumnOverride);

            const simulatedOffset = Math.floor(Math.random() * 1000000);
            result.simulatedOffset = simulatedOffset;

            // Extract signal metadata for the UI
            let signalMetadata = [];
            let mappedSamples = [];

            // All formats now use unified multiSignals from the worker
            const signals = result.multiSignals || {};
            const signalKeys = Object.keys(signals);

            console.log(`✅ [Uploader] ${result.header.signature} signals: [${signalKeys.join(', ')}]`);

            signalMetadata = signalKeys.map(id => ({
                id, name: id, unit: 'RAW', source: file.name
            }));
            mappedSamples = signalKeys.map(id => ({
                id, data: signals[id]
            }));

            result.signalMetadata = signalMetadata;

            // 4. Cache the result
            const cacheKey = StorageService.generateKey(file);
            await StorageService.cacheMetadata(cacheKey, {
                name: file.name,
                size: file.size,
                lastModified: file.lastModified,
                metadata: { ...result, mappedSamples },
                timestamp: Date.now()
            });

            addSource(file.name);
            setAvailableSignals(signalMetadata as any);
            mappedSamples.forEach((ms, idx) => {
                setSamples(ms.id as string, ms.data as any);
                if (idx === 0) {
                    useStore.getState().toggleSignal(ms.id as string);
                }
            });
            setGlobalOffset(simulatedOffset);

            // Broadcast data to other peers
            setTimeout(() => {
                const samplesMap: Record<string, any[]> = {};
                mappedSamples.forEach(ms => {
                    samplesMap[ms.id as string] = ms.data as any[];
                });
                console.log('📡 Broadcasting new dataset to peers...');
                colabService.broadcastData(signalMetadata, samplesMap);
                colabService.broadcastSignals(useStore.getState().visibleSignals);
            }, 100);

            worker.terminate();
        } catch (err: any) {
            console.error('Parsing failed:', err);
            setError(err.message || 'Failed to parse file');
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <div className="w-full flex flex-col gap-4">
            {headers.length > 0 && pendingFile ? (
                <div className="p-4 border-2 border-blue-500/50 bg-slate-900/50 rounded-2xl animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Configure Data Columns
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                        We found {headers.length} columns in <strong>{pendingFile.name}</strong>. Please confirm which column represents the Time/X-Axis.
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="text-xs text-slate-500 block mb-1 uppercase tracking-wider">Time Column</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-blue-500"
                                value={selectedTimeColumn}
                                onChange={(e) => setSelectedTimeColumn(e.target.value)}
                            >
                                {headers.map(h => (
                                    <option key={h} value={h}>{h}</option>
                                ))}
                            </select>
                        </div>
                        <div className="pt-5">
                            <button
                                onClick={() => executeParse(pendingFile, selectedTimeColumn)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Import Data
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <label className={`
            relative flex flex-col items-center justify-center w-full h-48 
            border-2 border-dashed rounded-2xl cursor-pointer transition-all
            ${isParsing ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-900/40'}
          `}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isParsing ? (
                            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
                        ) : error ? (
                            <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
                        ) : (
                            <>
                                <Upload className="w-12 h-12 text-slate-400 mb-4" />
                                <p className="mt-4 text-slate-300 font-medium tracking-wide">
                                    Click or Drag to Upload Data File
                                </p>
                                <p className="mt-1 text-slate-500 text-xs">
                                    Supported: .csv, .xlsx, .xls
                                </p>
                            </>
                        )}

                        <p className="mb-2 text-sm text-slate-200 font-medium">
                            {isParsing ? 'Parsing Data File...' : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                            {lastFile ? `Last: ${lastFile}` : ''}
                        </p>
                    </div>
                    <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={onFileUpload} disabled={isParsing} />
                </label>
            )}

            {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {lastFile && !error && !isParsing && headers.length === 0 && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    {isFromCache ? (
                        <Database className="w-4 h-4 flex-shrink-0" />
                    ) : (
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    {isFromCache ? `Lightning Load: ${lastFile} (from cache)` : `Successfully parsed ${lastFile}.`}
                </div>
            )}
        </div>
    );
};
