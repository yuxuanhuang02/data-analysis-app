import { get, set, del, keys } from 'idb-keyval';

/**
 * Storage service for caching parsed BLF metadata and signal indices.
 * Uses IndexedDB to handle large objects without blocking the main thread.
 */

export interface CachedFile {
    name: string;
    size: number;
    lastModified: number;
    metadata: any;
    timestamp: number; // Cache entry creation time
}

export const StorageService = {
    /**
     * Generate a simple unique key for a file based on its properties.
     */
    generateKey(file: File): string {
        return `v11_blf_cache_${file.name}_${file.size}_${file.lastModified}`;
    },

    /**
     * Retrieve cached metadata for a file.
     */
    async getCachedMetadata(key: string): Promise<CachedFile | undefined> {
        try {
            return await get(key);
        } catch (err) {
            console.warn('Failed to read from IndexedDB:', err);
            return undefined;
        }
    },

    /**
     * Stroe parsed metadata in the cache.
     */
    async cacheMetadata(key: string, data: CachedFile): Promise<void> {
        try {
            await set(key, data);
        } catch (err) {
            console.error('Failed to write to IndexedDB:', err);
        }
    },

    /**
     * Remove a specific cache entry.
     */
    async clearEntry(key: string): Promise<void> {
        await del(key);
    },

    /**
     * List all cached files.
     */
    async listCachedFiles(): Promise<string[]> {
        return (await keys()) as string[];
    }
};
