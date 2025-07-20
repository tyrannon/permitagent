import * as Minio from 'minio';
import { Readable } from 'stream';
import { config } from '../config';
import crypto from 'crypto';
import path from 'path';

export interface UploadResult {
  key: string;
  bucket: string;
  size: number;
  etag: string;
  url?: string;
}

export interface StorageFile {
  key: string;
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export class StorageService {
  private client: Minio.Client;
  private bucketName: string;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env['MINIO_ENDPOINT'] || 'localhost',
      port: Number(process.env['MINIO_PORT']) || 9000,
      useSSL: process.env['MINIO_USE_SSL'] === 'true',
      accessKey: process.env['MINIO_ACCESS_KEY'] || 'minioadmin',
      secretKey: process.env['MINIO_SECRET_KEY'] || 'minioadmin',
    });

    this.bucketName = process.env['MINIO_BUCKET'] || 'permitai-documents';
    this.initializeBucket();
  }

  private async initializeBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        console.log(`Created bucket: ${this.bucketName}`);

        // Set bucket policy for public read access to certain files
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/public/*`],
            },
          ],
        };

        await this.client.setBucketPolicy(
          this.bucketName,
          JSON.stringify(policy)
        );
      }
    } catch (error) {
      console.error('Error initializing bucket:', error);
    }
  }

  generateKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    return `${prefix}/${timestamp}-${random}-${sanitizedName}${ext}`;
  }

  async upload(
    file: StorageFile,
    prefix: string = 'documents'
  ): Promise<UploadResult> {
    const key = this.generateKey(prefix, file.originalname);
    const stream = Readable.from(file.buffer);

    const metadata = {
      'Content-Type': file.mimetype,
      'X-Original-Name': file.originalname,
      'X-Upload-Date': new Date().toISOString(),
    };

    try {
      const result = await this.client.putObject(
        this.bucketName,
        key,
        stream,
        file.size,
        metadata
      );

      return {
        key,
        bucket: this.bucketName,
        size: file.size,
        etag: result.etag,
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  async uploadStream(
    stream: Readable,
    key: string,
    mimetype: string,
    size?: number
  ): Promise<UploadResult> {
    const metadata = {
      'Content-Type': mimetype,
      'X-Upload-Date': new Date().toISOString(),
    };

    try {
      const result = await this.client.putObject(
        this.bucketName,
        key,
        stream,
        size,
        metadata
      );

      return {
        key,
        bucket: this.bucketName,
        size: size || 0,
        etag: result.etag,
      };
    } catch (error) {
      console.error('Stream upload error:', error);
      throw new Error('Failed to upload stream');
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(this.bucketName, key);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Download error:', error);
      throw new Error('Failed to download file');
    }
  }

  async getStream(key: string): Promise<Readable> {
    try {
      return await this.client.getObject(this.bucketName, key);
    } catch (error) {
      console.error('Get stream error:', error);
      throw new Error('Failed to get file stream');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, key);
    } catch (error) {
      console.error('Delete error:', error);
      throw new Error('Failed to delete file');
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    try {
      await this.client.removeObjects(this.bucketName, keys);
    } catch (error) {
      console.error('Delete many error:', error);
      throw new Error('Failed to delete files');
    }
  }

  async getMetadata(key: string): Promise<any> {
    try {
      const stat = await this.client.statObject(this.bucketName, key);
      return {
        size: stat.size,
        etag: stat.etag,
        lastModified: stat.lastModified,
        metadata: stat.metaData,
      };
    } catch (error) {
      console.error('Get metadata error:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, key);
      return true;
    } catch (error) {
      return false;
    }
  }

  getPublicUrl(key: string): string {
    const endpoint = process.env['MINIO_ENDPOINT'] || 'localhost';
    const port = process.env['MINIO_PORT'] || '9000';
    const useSSL = process.env['MINIO_USE_SSL'] === 'true';
    const protocol = useSSL ? 'https' : 'http';
    
    return `${protocol}://${endpoint}:${port}/${this.bucketName}/${key}`;
  }

  async getPresignedUrl(
    key: string,
    expiry: number = 3600
  ): Promise<string> {
    try {
      return await this.client.presignedGetObject(
        this.bucketName,
        key,
        expiry
      );
    } catch (error) {
      console.error('Presigned URL error:', error);
      throw new Error('Failed to generate presigned URL');
    }
  }

  async getPresignedUploadUrl(
    key: string,
    expiry: number = 3600
  ): Promise<string> {
    try {
      return await this.client.presignedPutObject(
        this.bucketName,
        key,
        expiry
      );
    } catch (error) {
      console.error('Presigned upload URL error:', error);
      throw new Error('Failed to generate presigned upload URL');
    }
  }

  async listFiles(
    prefix: string,
    maxKeys: number = 100
  ): Promise<Minio.BucketItem[]> {
    try {
      const stream = this.client.listObjectsV2(
        this.bucketName,
        prefix,
        true
      );
      
      const files: Minio.BucketItem[] = [];
      let count = 0;

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (count < maxKeys) {
            files.push(obj);
            count++;
          } else {
            stream.destroy();
          }
        });
        stream.on('end', () => resolve(files));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('List files error:', error);
      throw new Error('Failed to list files');
    }
  }
}

export const storageService = new StorageService();