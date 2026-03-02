'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useStore } from '@/store';
import { colabService } from '@/lib/collaboration/socket';
import { RemoteCursors } from '@/components/analysis/RemoteCursors';

interface WaveformViewProps {
    height?: number;
}

export const WaveformView: React.FC<WaveformViewProps> = ({ height = 400 }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const mouseRef = useRef<{ x: number; y: number; inside: boolean; t?: number; v?: number }>({ x: 0, y: 0, inside: false });

    const [cursors, setCursors] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });

    const setZoomLevel = useStore((s) => s.setZoomLevel);
    const setHorizontalScroll = useStore((s) => s.setHorizontalScroll);

    // ── DOM Mouse Tracking (fixes crosshair position) ──────────────────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onMove = (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            mouseRef.current.x = e.clientX - rect.left;
            mouseRef.current.y = e.clientY - rect.top;
            mouseRef.current.inside = true;
            colabService.trackMouse(
                mouseRef.current.x,
                mouseRef.current.y,
                mouseRef.current.t,
                mouseRef.current.v
            );
        };
        const onLeave = () => { mouseRef.current.inside = false; };
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
        return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
    }, []);

    // ── PixiJS Renderer ────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return;

        const setup = async () => {
            const app = new PIXI.Application();
            await app.init({
                background: '#0d1117',
                resizeTo: containerRef.current!,
                antialias: true,
                preserveDrawingBuffer: true // Required for html2canvas PDF export
            });

            containerRef.current?.appendChild(app.canvas);
            appRef.current = app;

            const gridLayer = new PIXI.Graphics();
            const signalLayer = new PIXI.Graphics();
            const uiLayer = new PIXI.Graphics();
            app.stage.addChild(gridLayer, signalLayer, uiLayer);

            const labelStyle = { fontFamily: 'Inter, monospace', fontSize: 10, fill: 0x8b949e };
            const xLabels: PIXI.Text[] = [];
            const yLabels: PIXI.Text[] = [];
            for (let i = 0; i < 30; i++) {
                const xl = new PIXI.Text({ text: '', style: labelStyle });
                const yl = new PIXI.Text({ text: '', style: labelStyle });
                xl.visible = yl.visible = false;
                app.stage.addChild(xl, yl);
                xLabels.push(xl); yLabels.push(yl);
            }

            const tooltip = new PIXI.Text({
                text: '',
                style: { fontFamily: 'monospace', fontSize: 11, fill: 0x00e5ff }
            });
            app.stage.addChild(tooltip);

            app.ticker.add(() => {
                const state = useStore.getState();
                const { visibleSignals, currentSamples, zoomLevel, horizontalScroll } = state;

                gridLayer.clear(); signalLayer.clear(); uiLayer.clear();
                xLabels.forEach(l => l.visible = false);
                yLabels.forEach(l => l.visible = false);

                if (visibleSignals.length === 0) { tooltip.visible = false; return; }

                // 1. COMPUTE BOUNDS
                let minT = Infinity, maxT = -Infinity, minV = Infinity, maxV = -Infinity;
                visibleSignals.forEach(id => {
                    (currentSamples[id] || []).forEach(p => {
                        if (p.timestamp < minT) minT = p.timestamp;
                        if (p.timestamp > maxT) maxT = p.timestamp;
                        if (p.value < minV) minV = p.value;
                        if (p.value > maxV) maxV = p.value;
                    });
                });
                if (minT === Infinity) { tooltip.visible = false; return; }

                const totalTRange = maxT - minT || 1;
                const totalVRange = maxV - minV || 1;

                const MARGIN_L = 55; // space for Y labels
                const MARGIN_B = 25; // space for X labels
                const plotW = app.screen.width - MARGIN_L - 10;
                const plotH = height - MARGIN_B - 10;

                const baseScaleX = plotW / totalTRange;
                const scaleX = baseScaleX * zoomLevel;
                const scaleY = plotH / totalVRange;

                // Viewport start time
                const viewportTStart = minT + horizontalScroll * totalTRange;
                const offsetX = MARGIN_L - (viewportTStart - minT) * scaleX;

                // 2. GRID + LABELS
                const getStep = (range: number) => {
                    const raw = range / 6;
                    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-15))));
                    const norm = raw / mag;
                    return (norm < 2 ? 1 : norm < 5 ? 2 : 5) * mag;
                };

                const visibleTRange = plotW / scaleX;
                const tStep = getStep(visibleTRange);
                const tStart = Math.ceil(viewportTStart / tStep) * tStep;

                gridLayer.setStrokeStyle({ width: 1, color: 0x21262d, alpha: 0.5 });
                let xlIdx = 0;
                for (let t = tStart; t < viewportTStart + visibleTRange + tStep; t += tStep) {
                    const x = offsetX + (t - minT) * scaleX;
                    if (x < MARGIN_L - 1 || x > app.screen.width + 1) continue;
                    gridLayer.moveTo(x, 0).lineTo(x, plotH);
                    if (xlIdx < xLabels.length) {
                        const l = xLabels[xlIdx++]; l.visible = true;
                        // Display in seconds with adaptive precision
                        const tSec = t / 1000;
                        l.text = Math.abs(tSec) >= 1 ? `${tSec.toFixed(3)}s` : `${(t).toFixed(1)}ms`;
                        l.x = x - l.width / 2; l.y = plotH + 5;
                    }
                }

                const vStep = getStep(totalVRange);
                const vStart = Math.ceil(minV / vStep) * vStep;
                let ylIdx = 0;
                for (let v = vStart; v <= maxV + vStep * 0.01; v += vStep) {
                    const y = plotH - (v - minV) * scaleY;
                    if (y < -1 || y > plotH + 1) continue;
                    gridLayer.moveTo(MARGIN_L, y).lineTo(app.screen.width, y);
                    if (ylIdx < yLabels.length) {
                        const l = yLabels[ylIdx++]; l.visible = true;
                        l.text = v.toFixed(2); l.x = 2; l.y = y - l.height / 2;
                    }
                }
                gridLayer.stroke();

                // Axes border lines
                gridLayer.setStrokeStyle({ width: 1, color: 0x444c56, alpha: 1 });
                gridLayer.moveTo(MARGIN_L, 0).lineTo(MARGIN_L, plotH);
                gridLayer.moveTo(MARGIN_L, plotH).lineTo(app.screen.width, plotH);
                gridLayer.stroke();

                // 3. SIGNALS
                const colors = [0x58a6ff, 0x3fb950, 0xd29922, 0xf85149, 0xbc8cff, 0x39d353, 0xffa657];
                visibleSignals.forEach((id, idx) => {
                    const samples = currentSamples[id];
                    if (!samples || samples.length < 2) return;
                    signalLayer.setStrokeStyle({ width: 1.5, color: colors[idx % colors.length], alpha: 0.9 });
                    let started = false;
                    samples.forEach((p) => {
                        const x = offsetX + (p.timestamp - minT) * scaleX;
                        if (x < MARGIN_L - 50 || x > app.screen.width + 50) {
                            if (started) { signalLayer.stroke(); started = false; }
                            return;
                        }
                        const y = plotH - (p.value - minV) * scaleY;
                        if (!started) { signalLayer.moveTo(x, y); started = true; }
                        else { signalLayer.lineTo(x, y); }
                    });
                    if (started) signalLayer.stroke();
                });

                // 4. CROSSHAIR (using DOM mouse position from mouseRef)
                const { x: mx, y: my, inside } = mouseRef.current;
                const inPlot = inside && mx > MARGIN_L && mx < app.screen.width && my > 0 && my < plotH;

                if (inPlot) {
                    uiLayer.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.35 });
                    uiLayer.moveTo(mx, 0).lineTo(mx, plotH);
                    uiLayer.moveTo(MARGIN_L, my).lineTo(app.screen.width, my);
                    uiLayer.stroke();

                    // Nearest point measurement for MULTIPLE signals
                    const hT = viewportTStart + (mx - MARGIN_L) / scaleX;
                    const colors = [0x58a6ff, 0x3fb950, 0xd29922, 0xf85149, 0xbc8cff, 0x39d353, 0xffa657];

                    let tooltipLines: string[] = [];
                    let bestSnapT = hT;
                    let minDiffT = Infinity;
                    let hVPrimary = 0; // Value of the closest point

                    visibleSignals.forEach((id, idx) => {
                        const samples = currentSamples[id];
                        if (!samples || samples.length === 0) return;

                        // Find closest point in time for this signal
                        let closest = samples[0];
                        const sIdx = samples.findIndex(p => p.timestamp >= hT);

                        if (sIdx >= 0) {
                            if (sIdx === 0) {
                                closest = samples[0];
                            } else {
                                const pPrev = samples[sIdx - 1];
                                const pNext = samples[sIdx];
                                const diffPrev = Math.abs(pPrev.timestamp - hT);
                                const diffNext = Math.abs(pNext.timestamp - hT);
                                closest = diffPrev <= diffNext ? pPrev : pNext;
                            }

                            const hV = closest.value;
                            const tDiff = Math.abs(closest.timestamp - hT);

                            // Track the absolutely closest timestamp across all signals to show as the primary Time
                            if (tDiff < minDiffT) {
                                minDiffT = tDiff;
                                bestSnapT = closest.timestamp;
                                hVPrimary = hV;
                            }

                            // Draw snap circle in signal's color
                            const snapX = MARGIN_L + (closest.timestamp - minT) * scaleX;
                            const snapY = plotH - (hV - minV) * scaleY;
                            const color = colors[idx % colors.length];

                            uiLayer.beginFill(color);
                            uiLayer.drawCircle(snapX, snapY, 4);
                            uiLayer.endFill();
                            uiLayer.setStrokeStyle({ width: 2, color: 0xffffff });
                            uiLayer.drawCircle(snapX, snapY, 4);

                            // Add to tooltip lines
                            tooltipLines.push(`${id}: ${hV.toFixed(5)}`);
                        }
                    });

                    const tSec = bestSnapT / 1000;
                    const tStr = Math.abs(tSec) >= 1
                        ? `${tSec.toFixed(7)}s`
                        : `${bestSnapT.toFixed(4)}ms`;

                    tooltip.text = `T: ${tStr}\n${tooltipLines.join('\n')}`;
                    tooltip.x = mx + 15;
                    tooltip.y = my - Math.max(40, tooltipLines.length * 15);
                    if (tooltip.x + tooltip.width > app.screen.width - 5) tooltip.x = mx - tooltip.width - 15;
                    tooltip.visible = true;

                    // Track logical coordinates for remote broadcast
                    mouseRef.current.t = bestSnapT;
                    mouseRef.current.v = hVPrimary; // Primary V
                } else {
                    tooltip.visible = false;
                    mouseRef.current.t = undefined;
                    mouseRef.current.v = undefined;
                }

                // 5. REMOTE CURSORS
                Object.values(useStore.getState().cursors).forEach((rc) => {
                    // Ignore our own cursor
                    if (rc.id === colabService.userId) return;

                    // If the remote cursor has logical coordinates, map them to current screen
                    if (rc.t !== undefined && rc.v !== undefined) {
                        const rx = offsetX + (rc.t - minT) * scaleX;
                        const ry = plotH - (rc.v - minV) * scaleY;

                        // Draw snap circle for remote user if in bounds
                        if (rx >= MARGIN_L && rx <= app.screen.width && ry >= 0 && ry <= plotH) {
                            uiLayer.beginFill(Number(rc.color.replace('#', '0x')));
                            uiLayer.drawCircle(rx, ry, 6);
                            uiLayer.endFill();
                            uiLayer.setStrokeStyle({ width: 2, color: 0xffffff });
                            uiLayer.drawCircle(rx, ry, 6);

                            // Draw connecting lines (ghosted)
                            uiLayer.setStrokeStyle({ width: 1, color: Number(rc.color.replace('#', '0x')), alpha: 0.3 });
                            uiLayer.moveTo(rx, 0).lineTo(rx, plotH);
                            uiLayer.moveTo(MARGIN_L, ry).lineTo(app.screen.width, ry);
                            uiLayer.stroke();
                        }

                        // We still update the cursor object X/Y for the HTML DOM overlay to draw the name label
                        rc.x = rx;
                        rc.y = ry;
                    }
                });

            });
        };

        setup();
        return () => { appRef.current?.destroy(true, { children: true }); };
    }, [height, cursors]);

    // ── Wheel Zoom + Drag Pan ──────────────────────────────────────────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        let dragging = false;
        let dragStartX = 0;
        let scrollAtDragStart = 0;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const state = useStore.getState();
            const delta = e.deltaY > 0 ? 0.8 : 1.25;
            const newZoom = Math.max(1, Math.min(100000, state.zoomLevel * delta));
            setZoomLevel(newZoom);
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 0) {
                dragging = true;
                dragStartX = e.clientX;
                scrollAtDragStart = useStore.getState().horizontalScroll;
            }
        };
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragging) return;
            const state = useStore.getState();
            const rect = el.getBoundingClientRect();
            const plotW = rect.width - 55 - 10;
            const dx = (e.clientX - dragStartX) / (plotW * state.zoomLevel);
            setHorizontalScroll(Math.max(0, Math.min(1 - 1 / state.zoomLevel, scrollAtDragStart - dx)));
        };
        const handleMouseUp = () => { dragging = false; };

        el.addEventListener('wheel', handleWheel, { passive: false });
        el.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            el.removeEventListener('wheel', handleWheel);
            el.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [setZoomLevel, setHorizontalScroll]);

    const zoomFactor = 1.5;
    const currentZoom = useStore((s) => s.zoomLevel);

    return (
        <div className="relative group select-none overflow-hidden rounded-lg">
            <RemoteCursors />
            <div
                ref={containerRef}
                className="w-full rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-xl relative"
                style={{ height }}
            />
            {/* Zoom Controls */}
            <div className="absolute right-4 top-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setZoomLevel(currentZoom * zoomFactor)} className="p-2 bg-slate-800/80 backdrop-blur border border-slate-600 rounded-md hover:bg-slate-700 text-white shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                </button>
                <button onClick={() => setZoomLevel(Math.max(1, currentZoom / zoomFactor))} className="p-2 bg-slate-800/80 backdrop-blur border border-slate-600 rounded-md hover:bg-slate-700 text-white shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                </button>
                <button onClick={() => { setZoomLevel(1); setHorizontalScroll(0); }} className="p-2 bg-slate-800/80 backdrop-blur border border-slate-600 rounded-md hover:bg-slate-700 text-white shadow-lg text-[10px] font-black">
                    FIT
                </button>
            </div>
            {/* Precision Mode Badge */}
            <div className="absolute left-16 top-4 px-2 py-1 bg-slate-800/60 backdrop-blur rounded text-[10px] text-cyan-400 font-mono pointer-events-none border border-cyan-900/50">
                ⚡ PRECISION MODE · 10⁻⁷s · INTERPOLATED
            </div>
        </div>
    );
};
