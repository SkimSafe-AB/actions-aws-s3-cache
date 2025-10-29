export interface CacheInputs {
    key: string;
    paths: string[];
    restoreKeys?: string[];
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsRegion: string;
    s3Bucket: string;
    s3Prefix: string;
    compressionLevel: number;
    failOnCacheMiss: boolean;
}
export interface CacheOutputs {
    cacheHit: boolean;
    cachePrimaryKey: string;
    cacheMatchedKey: string;
}
export interface S3CacheMetadata {
    repository: string;
    ref: string;
    key: string;
    created: string;
}
export interface CacheOperationResult {
    success: boolean;
    cacheHit?: boolean;
    matchedKey?: string;
    error?: string;
}
export interface S3Config {
    region: string;
    credentials: {
        accessKeyId: string;
        secretAccessKey: string;
    };
}
export declare class CacheError extends Error {
    readonly code?: string | undefined;
    constructor(message: string, code?: string | undefined);
}
export declare class S3Error extends Error {
    readonly code?: string | undefined;
    constructor(message: string, code?: string | undefined);
}
//# sourceMappingURL=index.d.ts.map