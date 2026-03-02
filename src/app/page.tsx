'use client';

import { useEffect, useState } from 'react';
import { WaveformView } from '../components/renderer/WaveformView';
import { FileUploader } from '../components/analysis/FileUploader';
import { SignalList } from '../components/analysis/SignalList';
import { RemoteCursors } from '../components/analysis/RemoteCursors';
import { colabService } from '@/lib/collaboration/socket';
import { BenchmarkUtils } from '@/lib/utils/benchmark';
import { useStore } from '@/store';
import { Zap, Activity, Download, FileDown } from 'lucide-react';
import { ExportService } from '@/lib/utils/export';

export default function Home() {
  const visibleSignals = useStore((state) => state.visibleSignals);
  const currentSamples = useStore((state) => state.currentSamples);
  const setAvailableSignals = useStore((state) => state.setAvailableSignals);
  const setSamples = useStore((state) => state.setSamples);
  const toggleSignal = useStore((state) => state.toggleSignal);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  const handleExportExcel = async () => {
    if (visibleSignals.length === 0) {
      alert("Please select at least one signal before exporting to Excel.");
      return;
    }
    try {
      const activeId = visibleSignals[0];
      const samples = currentSamples[activeId] || [];
      if (samples.length === 0) {
        alert("No samples found for the selected signal.");
        return;
      }
      alert(`Exporting ${samples.length} points to Excel... Please wait.`);
      await ExportService.exportToExcel(activeId, samples);
      alert("Excel export complete!");
    } catch (err: any) {
      console.error("Excel export error:", err);
      alert("Failed to export Excel: " + err.message);
    }
  };

  const handleExportPdf = async () => {
    try {
      alert("Capturing dashboard... Please wait.");
      await ExportService.generatePdfReport('dashboard-main');
      alert("PDF report complete!");
    } catch (err: any) {
      console.error("PDF export error:", err);
      alert("Failed to generate PDF: " + err.message);
    }
  };

  const handleStressTest = async (count: number) => {
    setIsBenchmarking(true);
    await BenchmarkUtils.measure(`${count} Signals Stress Test`, async () => {
      const { metadata, samples } = BenchmarkUtils.generateStressData(count, 1000);
      setAvailableSignals(metadata);
      Object.keys(samples).forEach(id => {
        setSamples(id, samples[id]);
        toggleSignal(id); // Auto-enable all for stress
      });
    });
    setIsBenchmarking(false);
  };

  useEffect(() => {
    colabService.connect();
  }, []);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-between p-24 bg-slate-950 text-slate-100 relative overflow-hidden"
    >
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex border-b border-slate-800 pb-6 mb-12">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            ITI Online Data Analysis
          </h1>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => handleStressTest(100)}
              disabled={isBenchmarking}
              className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[10px] text-amber-400 hover:bg-amber-500/20 flex items-center gap-1 transition-all"
            >
              <Zap className="w-3 h-3" />
              Stress: 100
            </button>
            <button
              onClick={() => handleStressTest(500)}
              disabled={isBenchmarking}
              className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-full text-[10px] text-rose-400 hover:bg-rose-500/20 flex items-center gap-1 transition-all"
            >
              <Activity className="w-3 h-3" />
              Stress: 500
            </button>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleExportPdf}
            className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-[10px] text-blue-400 hover:bg-blue-500/20 flex items-center gap-1 transition-all"
          >
            <FileDown className="w-3 h-3" />
            PDF Report
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1 transition-all"
          >
            <Download className="w-3 h-3" />
            Export CSV/Excel
          </button>
          <span className="px-3 py-1 bg-slate-800 rounded-full border border-slate-700">Next.js 15</span>
          <span className="px-3 py-1 bg-slate-800 rounded-full border border-slate-700">WebGL (PixiJS)</span>
        </div>
      </div>

      <div id="dashboard-main" className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-5xl">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-200">Real-time Waveform Preview</h2>
              <div className="text-[10px] text-slate-500 font-mono">
                VCTM Clock: <span className="text-blue-400">0 μs</span>
              </div>
            </div>
            <WaveformView height={300} />
          </section>

          <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md flex flex-col gap-6">
            <div>
              <h2 className="text-xl mb-4 font-semibold text-slate-200">Data Import</h2>
              <FileUploader />
            </div>
            <div className="flex-1 border-t border-slate-800 pt-6">
              <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Discovered Signals</h3>
              <SignalList />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="p-6 bg-gradient-to-br from-blue-600/20 to-emerald-600/20 rounded-2xl border border-blue-500/20">
            <h3 className="text-lg font-bold mb-2">Collaboration Active</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time synchronization with peers enabled. All cursors and annotations are globally aligned via the VCTM model.
            </p>
          </div>

          <div className="p-6 bg-slate-900/80 rounded-2xl border border-slate-800">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">System Health</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">WebGL Renderer</span>
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Worker Thread</span>
                <span className="text-emerald-400">Ready</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
