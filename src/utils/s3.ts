import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as fs from 'fs';
import { S3Config, S3CacheMetadata, S3Error } from '../types';

export class S3CacheClient {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3Config, bucket: string) {
    this.client = new S3Client(config);
    this.bucket = bucket;
  }

  /**
   * Check if an object exists in S3
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));
      return true;
    } catch (error: any) {
      if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw new S3Error(`Failed to check object existence: ${error.message}`, error.name);
    }
  }

  /**
   * Download an object from S3 to local file
   */
  async downloadObject(key: string, localPath: string): Promise<void> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new S3Error('Empty response body from S3');
      }

      const writeStream = fs.createWriteStream(localPath);

      // Convert the readable stream to bytes and write to file
      if (response.Body) {
        const chunks: Uint8Array[] = [];

        // Handle the async iterable response body
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);

        return new Promise((resolve, reject) => {
          writeStream.write(buffer, (error) => {
            if (error) {
              reject(error);
            } else {
              writeStream.end();
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
            }
          });
        });
      }
    } catch (error: any) {
      throw new S3Error(`Failed to download object: ${error.message}`, error.name);
    }
  }

  /**
   * Upload a file to S3
   */
  async uploadObject(key: string, localPath: string, metadata?: S3CacheMetadata): Promise<void> {
    try {
      const fileStream = fs.createReadStream(localPath);
      const stats = fs.statSync(localPath);

      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: fileStream,
          ContentLength: stats.size,
          Metadata: metadata ? {
            repository: metadata.repository,
            ref: metadata.ref,
            key: metadata.key,
            created: metadata.created
          } : undefined
        }
      });

      await upload.done();
    } catch (error: any) {
      throw new S3Error(`Failed to upload object: ${error.message}`, error.name);
    }
  }

  /**
   * Generate S3 key for cache
   */
  static generateCacheKey(prefix: string, repository: string, ref: string, cacheKey: string): string {
    const repoName = repository.split('/').pop() || repository;
    return `${prefix}/${repoName}/${ref}/${cacheKey}.tar.gz`;
  }
}