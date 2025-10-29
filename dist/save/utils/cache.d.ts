export declare class CacheUtils {
    /**
     * Check if all specified paths exist
     */
    static validatePaths(paths: string[]): Promise<{
        validPaths: string[];
        missingPaths: string[];
    }>;
    /**
     * Check if a path exists
     */
    static pathExists(filePath: string): Promise<boolean>;
    /**
     * Create a compressed tar archive of the specified paths
     */
    static createArchive(paths: string[], archivePath: string, compressionLevel: number): Promise<void>;
    /**
     * Extract a tar archive
     */
    static extractArchive(archivePath: string, extractTo?: string): Promise<void>;
    /**
     * Clean up temporary files
     */
    static cleanup(filePaths: string[]): Promise<void>;
    /**
     * Get environment variables for GitHub context
     */
    static getGitHubContext(): {
        repository: string;
        ref: string;
    };
    /**
     * Set action outputs
     */
    static setOutputs(cacheHit: boolean, primaryKey: string, matchedKey: string): void;
    /**
     * Log cache operation info
     */
    static logCacheInfo(operation: 'restore' | 'save', key: string, bucket: string, s3Key: string): void;
}
//# sourceMappingURL=cache.d.ts.map