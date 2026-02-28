import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { SignalPoint } from '../vctm/engine';

export interface ColumnMapping {
    timestamp: string;
    signals: string[];
}

export class TableParser {
    /**
     * Parse CSV data from an ArrayBuffer using a chunked streaming approach.
     * Extracts all numeric signals.
     */
    public async parseCsv(buffer: ArrayBuffer, mapping: ColumnMapping): Promise<{ signals: Record<string, SignalPoint[]> }> {
        return new Promise((resolve, reject) => {
            const blob = new Blob([buffer]);
            const signalData: Record<string, SignalPoint[]> = {};
            mapping.signals.forEach(id => signalData[id] = []);

            const maxPoints = 100000;
            let count = 0;

            Papa.parse(blob as any, {
                header: true,
                skipEmptyLines: true,
                chunk: (results) => {
                    if (count >= maxPoints) return;

                    results.data.forEach((row: any) => {
                        if (count >= maxPoints) return;

                        // Parse timestamp (handle both float and Date strings)
                        let rawT = row[mapping.timestamp];
                        if (!rawT) return;

                        let timestamp = parseFloat(rawT);
                        if (isNaN(timestamp)) {
                            const date = new Date(rawT);
                            timestamp = date.getTime();
                        }

                        if (isNaN(timestamp)) return;

                        // 💡 MITIGATION: If timestamps are identical/constant (e.g. only date, no time),
                        // increment by a small factor to ensure a visible horizonal axis.
                        Object.keys(signalData).forEach(sigId => {
                            const lastArr = signalData[sigId];
                            if (lastArr.length > 0) {
                                const lastT = lastArr[lastArr.length - 1].timestamp;
                                if (timestamp <= lastT) {
                                    timestamp = lastT + 1; // Increment by 1ms
                                }
                            }
                        });

                        // Skip unit rows (e.g. Row 2 in user's Excel)
                        // A unit row usually has non-numeric values in numeric columns
                        let isUnitRow = false;
                        mapping.signals.forEach(sigId => {
                            const val = row[sigId];
                            // If it's a non-numeric string like "kW" or "-", skip
                            if (val && typeof val === 'string' && isNaN(parseFloat(val)) && val.trim() !== '' && !/^-?\d/.test(val)) {
                                isUnitRow = true;
                            }
                        });
                        if (isUnitRow) return;

                        mapping.signals.forEach(sigId => {
                            const val = parseFloat(row[sigId]);
                            if (!isNaN(val)) {
                                signalData[sigId].push({ timestamp, value: val });
                            }
                        });
                        count++;
                    });
                },
                complete: () => {
                    console.log(`✅ [TableParser] CSV Parse Complete. Extracted ${count} points across ${mapping.signals.length} signals.`);
                    resolve({ signals: signalData });
                },
                error: (error) => reject(error)
            });
        });
    }

    /**
     * Parse Excel data. Simplified for now, similar to chunked logic but for all signals.
     */
    public async parseExcel(buffer: ArrayBuffer, mapping: ColumnMapping): Promise<{ signals: Record<string, SignalPoint[]> }> {
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        const signalData: Record<string, SignalPoint[]> = {};
        mapping.signals.forEach(id => signalData[id] = []);

        data.forEach(row => {
            let rawT = row[mapping.timestamp];
            if (!rawT) return;

            let timestamp = parseFloat(rawT);
            if (isNaN(timestamp)) {
                timestamp = new Date(rawT).getTime();
            }
            if (isNaN(timestamp)) return;

            // 💡 MITIGATION: Monotonic correction
            Object.keys(signalData).forEach(sigId => {
                const lastArr = signalData[sigId];
                if (lastArr.length > 0) {
                    const lastT = lastArr[lastArr.length - 1].timestamp;
                    if (timestamp <= lastT) {
                        timestamp = lastT + 1;
                    }
                }
            });

            // Skip unit rows
            let isUnitRow = false;
            mapping.signals.forEach(sigId => {
                const val = row[sigId];
                if (val && typeof val === 'string' && isNaN(parseFloat(val)) && val.trim() !== '' && !/^-?\d/.test(val)) {
                    isUnitRow = true;
                }
            });
            if (isUnitRow) return;

            mapping.signals.forEach(sigId => {
                const val = parseFloat(row[sigId]);
                if (!isNaN(val)) {
                    signalData[sigId].push({ timestamp, value: val });
                }
            });
        });

        return { signals: signalData };
    }

    /**
     * Best-effort column discovery.
     */
    public discoverMapping(headers: string[], overrideTime?: string): ColumnMapping {
        const tKeys = ['time', 'timestamp', 't', 'ms', 'μs', 'sec'];

        let timestampColumn = overrideTime;

        if (!timestampColumn || !headers.includes(timestampColumn)) {
            timestampColumn = headers.find(h => tKeys.some(k => h.toLowerCase().includes(k))) || headers[0];
        }

        // Every other column that isn't the timestamp is a potential signal
        const signals = headers.filter(h => h !== timestampColumn && h.trim().length > 0);

        console.log(`🔍 [TableParser] Mapping: Time=${timestampColumn}, Signals Count=${signals.length}`);
        return { timestamp: timestampColumn, signals };
    }
}
