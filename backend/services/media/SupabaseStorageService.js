import { createClient } from '@supabase/supabase-js';
import { MEDIA_CONFIG } from '../../config/media.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import logger from '../logger.js';

const UPLOAD_TIMEOUT = 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function _isRetryable(error) {
  if (!error) return false;
  const status = error.status || error.statusCode || 0;
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504 || status === 0;
}

function _sanitizePathPart(part) {
  return part.replace(/[^\w.-]/g, '').replace(/\.\./g, '').slice(0, 100);
}

class SupabaseStorageService {
  constructor() {
    this._baseUrl = (MEDIA_CONFIG.supabase.url || '').replace(/\/rest\/v1\/?$/, '');
    this.serviceClient = createClient(
      this._baseUrl,
      MEDIA_CONFIG.supabase.serviceRoleKey,
      {
        auth: { persistSession: false },
      }
    );
    this.buckets = MEDIA_CONFIG.supabase.buckets;
  }

  getClient() {
    return this.serviceClient;
  }

  async ensureBucket(bucketName) {
    const safe = _sanitizePathPart(bucketName);
    const { data: existing } = await this.serviceClient.storage.getBucket(safe);
    if (!existing) {
      await this.serviceClient.storage.createBucket(safe, {
        public: false,
      });
    }
  }

  async upload(file, options = {}) {
    const bucketKey = options.bucket || 'documents';
    const bucket = this.buckets[bucketKey] || bucketKey;

    await this.ensureBucket(bucket);

    const subfolder = _sanitizePathPart(options.folder || 'general');
    const ext = path.extname(file.originalname || file.name || 'file').toLowerCase();
    const fileName = `${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;
    const filePath = `${subfolder}/${fileName}`;

    const fileBuffer = file.buffer;

    return this._uploadWithRetry(bucket, filePath, fileBuffer, file.mimetype, `upload:${filePath}`);
  }

  async uploadBuffer(buffer, fileName, mimeType, options = {}) {
    const bucketKey = options.bucket || 'documents';
    const bucket = this.buckets[bucketKey] || bucketKey;

    await this.ensureBucket(bucket);

    const subfolder = _sanitizePathPart(options.folder || 'general');
    const ext = path.extname(fileName).toLowerCase();
    const name = `${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;
    const filePath = `${subfolder}/${name}`;

    return this._uploadWithRetry(bucket, filePath, buffer, mimeType, `uploadBuffer:${filePath}`);
  }

  async _uploadWithRetry(bucket, filePath, buffer, contentType, context) {
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this._uploadWithTimeout(bucket, filePath, buffer, contentType);
        if (attempt > 0) {
          logger.info('SupabaseStorageService', `Retry succeeded for ${context} after attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES && _isRetryable(error)) {
          logger.warn('SupabaseStorageService', `Upload failed for ${context} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`, { status: error.status, message: error.message });
          await delay(RETRY_DELAY_MS * Math.pow(2, attempt));
        }
      }
    }
    logger.error('SupabaseStorageService', `Upload failed for ${context} after ${MAX_RETRIES + 1} attempts`, { message: lastError.message });
    throw lastError;
  }

  async _uploadWithTimeout(bucket, filePath, buffer, contentType) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

    try {
      const { data, error } = await this.serviceClient.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType: contentType || 'application/octet-stream',
          upsert: false,
          signal: controller.signal,
        });

      clearTimeout(timer);
      if (error) throw error;

      const { data: urlData } = await this.serviceClient.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath,
        bucket,
        fullPath: `${bucket}/${filePath}`,
      };
    } catch (error) {
      clearTimeout(timer);
      if (error.name === 'AbortError') {
        throw new Error(`Supabase upload timed out after ${UPLOAD_TIMEOUT}ms`);
      }
      throw error;
    }
  }

  async remove(filePath, bucketName) {
    if (!filePath) return null;

    let bucket = bucketName;
    let path = filePath;

    if (!bucket) {
      const parts = filePath.split('/');
      bucket = parts[0];
      path = parts.slice(1).join('/');
    }

    const { error } = await this.serviceClient.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return true;
  }

  async removeByFullPath(fullPath) {
    if (!fullPath) return null;

    const parts = fullPath.split('/');
    const bucket = parts[0];
    const filePath = parts.slice(1).join('/');

    const { error } = await this.serviceClient.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
    return true;
  }

  async getSignedUrl(filePath, bucketName, expiresIn) {
    let bucket = bucketName;
    let path = filePath;

    if (!bucket) {
      const parts = filePath.split('/');
      bucket = parts[0];
      path = parts.slice(1).join('/');
    }

    const { data, error } = await this.serviceClient.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn || MEDIA_CONFIG.supabase.signedUrlExpiry);

    if (error) throw error;
    return data.signedUrl;
  }

  async getPublicUrl(filePath, bucketName) {
    let bucket = bucketName;
    let path = filePath;

    if (!bucket) {
      const parts = filePath.split('/');
      bucket = parts[0];
      path = parts.slice(1).join('/');
    }

    const { data } = await this.serviceClient.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  extractPath(url) {
    if (!url) return null;

    const supabaseUrl = this._baseUrl;
    const storagePrefix = `${supabaseUrl}/storage/v1/object/public/`;

    if (url.startsWith(storagePrefix)) {
      return url.slice(storagePrefix.length);
    }

    const signedPrefix = `${supabaseUrl}/storage/v1/object/sign/`;
    if (url.startsWith(signedPrefix)) {
      return null;
    }

    return null;
  }
}

export default new SupabaseStorageService();
