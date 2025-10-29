import { S3Config, S3CacheMetadata } from '../types';
export declare class S3CacheClient {
    private client;
    private bucket;
    constructor(config: S3Config, bucket: string);
    /**
     * Check if an object exists in S3
     */
    objectExists(key: string): Promise<boolean>;
    /**
     * Download an object from S3 to local file
     */
    downloadObject(key: string, localPath: string): Promise<void>;
    /**
     * Upload a file to S3
     */
    uploadObject(key: string, localPath: string, metadata?: S3CacheMetadata): Promise<void>;
    /**
     * Generate S3 key for cache
     */
    static generateCacheKey(prefix: string, repository: string, ref: string, cacheKey: string): string;
}
//# sourceMappingURL=s3.d.ts.map