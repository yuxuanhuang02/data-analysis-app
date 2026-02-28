/**
 * High-Performance JavaScript BLF (Binary Log Graphics) Parser
 * Fixed version with proper LOBJ scanning and CAN signal extraction.
 */

export interface BlfHeader {
    signature: string;
    version: number;
    fileSize: number;
    objectCount: number;
}

export interface BlfObject {
    signature: string;
    objectSize: number;
    objectType: number;
    timestamp: number; // microseconds (converted from nanoseconds bigint)
    channelId?: number;
    canId?: number;
    data?: Uint8Array;
}

export class BlfJsParser {
    private view: DataView;

    constructor(data: ArrayBuffer) {
        this.view = new DataView(data);
    }

    /**
     * Parse the main BLF file header (LOGG block, 144 bytes).
     */
    public parseHeader(): BlfHeader {
        if (this.view.byteLength < 144) {
            throw new Error('File too small for BLF header');
        }

        const sig = String.fromCharCode(
            this.view.getUint8(0),
            this.view.getUint8(1),
            this.view.getUint8(2),
            this.view.getUint8(3)
        );

        if (sig !== 'LOGG') {
            throw new Error(`Invalid BLF signature: "${sig}" - expected "LOGG"`);
        }

        return {
            signature: 'BLF',
            version: this.view.getUint32(12, true),
            fileSize: Number(this.view.getBigUint64(32, true)),
            objectCount: this.view.getUint32(44, true),
        };
    }

    /**
     * Scans objects in the BLF file.
     * Each LOBJ has a 32-byte base header:
     *   +0  : signature (4 bytes "LOBJ")
     *   +4  : header size (2 bytes)
     *   +6  : header version (2 bytes)
     *   +8  : object size (4 bytes including header)
     *   +12 : object type (4 bytes)
     *   +16 : timestamp (8 bytes, nanoseconds)
     *   +24+: object-specific data
     */
    public scanObjects(maxCount: number = 500): BlfObject[] {
        const objects: BlfObject[] = [];
        let pos = 144; // Skip the LOGG header

        while (pos + 32 <= this.view.byteLength && objects.length < maxCount) {
            // Check for LOBJ signature
            const sig = String.fromCharCode(
                this.view.getUint8(pos),
                this.view.getUint8(pos + 1),
                this.view.getUint8(pos + 2),
                this.view.getUint8(pos + 3)
            );

            if (sig !== 'LOBJ') {
                // Try to re-sync by scanning for next LOBJ
                let found = false;
                for (let scan = pos + 1; scan < Math.min(pos + 1024, this.view.byteLength - 4); scan++) {
                    if (this.view.getUint8(scan) === 76 && // L
                        this.view.getUint8(scan + 1) === 79 && // O
                        this.view.getUint8(scan + 2) === 66 && // B
                        this.view.getUint8(scan + 3) === 74) { // J
                        pos = scan;
                        found = true;
                        break;
                    }
                }
                if (!found) break;
                continue;
            }

            const headerSize = this.view.getUint16(pos + 4, true);
            const objSize = this.view.getUint32(pos + 8, true);
            const objType = this.view.getUint32(pos + 12, true);

            // Timestamp in nanoseconds, convert to ms (divide by 1,000,000)
            let timestampNs: bigint;
            try {
                timestampNs = this.view.getBigUint64(pos + 16, true);
            } catch {
                timestampNs = BigInt(0);
            }
            const timestampMs = Number(timestampNs) / 1000000;

            const obj: BlfObject = {
                signature: sig,
                objectSize: objSize,
                objectType: objType,
                timestamp: timestampMs,
            };

            // Extract signal data based on type
            const dataStart = pos + headerSize;
            if (objType === 1 && dataStart + 12 <= this.view.byteLength) {
                // CAN_MESSAGE: channel(2), dlc(1), flags(1), id(4), data[8]
                try {
                    obj.channelId = this.view.getUint16(dataStart, true);
                    obj.canId = this.view.getUint32(dataStart + 4, true) & 0x1FFFFFFF; // Strip flags
                    const dlc = this.view.getUint8(dataStart + 2) & 0x0F;
                    obj.data = new Uint8Array(this.view.buffer, dataStart + 8, Math.min(dlc, 8));
                } catch { /* ignore parse errors */ }
            } else if ((objType === 86 || objType === 100 || objType === 101) && dataStart + 16 <= this.view.byteLength) {
                // CAN_MESSAGE2 / CAN_FD_MESSAGE
                try {
                    obj.channelId = this.view.getUint16(dataStart, true);
                    obj.canId = this.view.getUint32(dataStart + 4, true) & 0x1FFFFFFF;
                    const dlc = this.view.getUint8(dataStart + 8) & 0x0F;
                    obj.data = new Uint8Array(this.view.buffer, dataStart + 16, Math.min(dlc, 8));
                } catch { /* ignore parse errors */ }
            }

            objects.push(obj);

            if (objSize < 32) break;
            // Align to 4-byte boundary
            const aligned = objSize % 4 === 0 ? objSize : objSize + (4 - objSize % 4);
            pos += aligned;
        }

        return objects;
    }
}
