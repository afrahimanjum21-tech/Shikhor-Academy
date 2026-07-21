import { v2 as cloudinary } from 'cloudinary';
import { MEDIA_CONFIG } from '../../config/media.js';
import logger from '../logger.js';

cloudinary.config({
  cloud_name: MEDIA_CONFIG.cloudinary.cloudName,
  api_key: MEDIA_CONFIG.cloudinary.apiKey,
  api_secret: MEDIA_CONFIG.cloudinary.apiSecret,
});

const UPLOAD_TIMEOUT = 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, context) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0) {
        logger.info('CloudinaryService', `Retry succeeded for ${context} after attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES && _isRetryable(error)) {
        logger.warn('CloudinaryService', `Upload failed for ${context} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`, { code: error.http_code, message: error.message });
        await delay(RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }
  logger.error('CloudinaryService', `Upload failed for ${context} after ${MAX_RETRIES + 1} attempts`, { message: lastError.message });
  throw lastError;
}

function _isRetryable(error) {
  if (!error) return false;
  const code = error.http_code || 0;
  return code === 429 || code === 500 || code === 502 || code === 503 || code === 504 || code === 0;
}

class CloudinaryService {
  constructor() {
    this.folders = MEDIA_CONFIG.cloudinary.folders;
  }

  async upload(file, options = {}) {
    const folderKey = options.folder || 'site';
    const folder = this.folders[folderKey] || folderKey;

    const uploadOptions = {
      folder: `uttoron/${folder}`,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
      ...options.transformations,
    };

    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }

    const context = `${uploadOptions.folder}/${file.originalname || 'unknown'}`;

    return withRetry(async () => {
      if (file.buffer) {
        const base64 = `data:${file.mimetype || 'image/jpeg'};base64,${file.buffer.toString('base64')}`;
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Cloudinary upload timed out after ${UPLOAD_TIMEOUT}ms`));
          }, UPLOAD_TIMEOUT);

          cloudinary.uploader.upload(base64, uploadOptions, (error, result) => {
            clearTimeout(timer);
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes,
            });
          });
        });
      }
      if (file.path) {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Cloudinary upload timed out after ${UPLOAD_TIMEOUT}ms`));
          }, UPLOAD_TIMEOUT);

          cloudinary.uploader.upload(file.path, uploadOptions, (error, result) => {
            clearTimeout(timer);
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes,
            });
          });
        });
      }
      throw new Error('No file data available');
    }, context);
  }

  async uploadBuffer(buffer, options = {}) {
    const folderKey = options.folder || 'site';
    const folder = this.folders[folderKey] || folderKey;

    const uploadOptions = {
      folder: `uttoron/${folder}`,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
      ...options.transformations,
    };

    const context = `${uploadOptions.folder}/buffer`;

    return withRetry(async () => {
      const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Cloudinary upload timed out after ${UPLOAD_TIMEOUT}ms`));
        }, UPLOAD_TIMEOUT);

        cloudinary.uploader.upload(base64, uploadOptions, (error, result) => {
          clearTimeout(timer);
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        });
      });
    }, context);
  }

  async destroy(publicId) {
    if (!publicId) return null;
    return cloudinary.uploader.destroy(publicId);
  }

  async getUrl(publicId, transformations = {}) {
    if (!publicId) return null;
    return cloudinary.url(publicId, {
      secure: true,
      ...transformations,
    });
  }

  extractPublicId(url) {
    if (!url) return null;

    const cloudName = MEDIA_CONFIG.cloudinary.cloudName;
    const prefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
    if (url.startsWith(prefix)) {
      const withoutPrefix = url.slice(prefix.length);
      const withoutTransform = withoutPrefix.replace(/^v\d+\//, '');
      return withoutTransform.replace(/\.[^.]+$/, '');
    }

    if (url.includes('/image/upload/')) {
      const parts = url.split('/image/upload/');
      if (parts.length === 2) {
        return parts[1].replace(/\.[^.]+$/, '');
      }
    }

    return null;
  }
}

export default new CloudinaryService();
