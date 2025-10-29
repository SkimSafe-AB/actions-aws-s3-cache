declare class Config {
    input: {
        key: string;
        path: string;
        restoreKeys?: string;
        awsAccessKeyId: string;
        awsSecretAccessKey: string;
        awsRegion: string;
        s3Bucket: string;
        s3Prefix: string;
        compressionLevel: string;
        compressionMethod: string;
        failOnCacheMiss: boolean;
    };
    githubContext: {
        owner: string;
        repo: string;
        repository: string;
        ref: string;
    };
    parsedInputs: {
        paths: string[];
        restoreKeys?: string[];
        compressionLevel: number;
        compressionMethod: string;
    };
    constructor();
    /**
     * Generate S3 cache key
     */
    generateS3Key(): string;
}
export default Config;
