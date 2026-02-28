import { SignalPoint, SignalMetadata } from '../vctm/engine';

export const BenchmarkUtils = {
    /**
     * Generate massive synthetic signal data.
     */
    generateStressData(signalCount: number, pointsPerSignal: number): {
        metadata: SignalMetadata[];
        samples: Record<string, SignalPoint[]>;
    } {
        const metadata: SignalMetadata[] = [];
        const samples: Record<string, SignalPoint[]> = {};

        for (let i = 0; i < signalCount; i++) {
            const id = `STRESS_SIGNAL_${i}`;
            metadata.push({
                id,
                name: `Stress Test Signal ${i}`,
                unit: 'V',
                source: 'Benchmark'
            });

            const data: SignalPoint[] = [];
            const freq = 0.01 + Math.random() * 0.05;
            const amp = 10 + Math.random() * 50;

            for (let j = 0; j < pointsPerSignal; j++) {
                data.push({
                    timestamp: j * 10,
                    value: Math.sin(j * freq) * amp + (Math.random() * 5)
                });
            }
            samples[id] = data;
        }

        return { metadata, samples };
    },

    /**
     * Measure execution time.
     */
    async measure(label: string, fn: () => Promise<any>): Promise<any> {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        console.log(`⏱️ [Benchmark] ${label}: ${(end - start).toFixed(2)}ms`);
        return result;
    }
};
