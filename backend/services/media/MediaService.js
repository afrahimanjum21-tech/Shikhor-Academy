import MediaValidator from './MediaValidator.js';
import CloudinaryService from './CloudinaryService.js';
import SupabaseStorageService from './SupabaseStorageService.js';
import { MEDIA_CONFIG, detectFileType } from '../../config/media.js';
import logger from '../logger.js';
import fs from 'fs';

function cleanupTempFile(file) {
  if (!file || !file.path) return;
  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
      logger.debug('MediaService', `Cleaned up temp file: ${file.path}`);
    }
  } catch {
    // best-effort
  }
}

class MediaService {
  async upload(file, options = {}) {
    const validation = MediaValidator.validate(file, options.expectedType);
    if (!validation.valid) {
      const error = new Error(validation.errors.join('; '));
      error.code = 'MEDIA_VALIDATION_ERROR';
      error.details = validation;
      cleanupTempFile(file);
      throw error;
    }

    try {
      const provider = this._resolveProvider(validation.detectedType);
      const uploadOptions = { ...options };

      let result;
      if (validation.detectedType === 'image') {
        if (!uploadOptions.folder) {
          uploadOptions.folder = options.folder || 'site';
        }
        result = await CloudinaryService.upload(file, uploadOptions);
      } else {
        if (!uploadOptions.bucket) {
          uploadOptions.bucket = options.bucket || this._defaultBucket(validation.detectedType);
        }
        if (!uploadOptions.folder) {
          uploadOptions.folder = options.folder || 'general';
        }
        result = await SupabaseStorageService.upload(file, uploadOptions);
      }

      cleanupTempFile(file);
      return result;
    } catch (error) {
      cleanupTempFile(file);
      throw error;
    }
  }

  async uploadBuffer(buffer, fileName, mimeType, options = {}) {
    const ext = this._getExtension(fileName);
    const detectedType = detectFileType(mimeType, ext);

    if (!detectedType) {
      const error = new Error(`Unsupported file type: ${mimeType || ext}`);
      error.code = 'MEDIA_VALIDATION_ERROR';
      throw error;
    }

    const sizeLimit = MEDIA_CONFIG.fileSizeLimits[detectedType] || MEDIA_CONFIG.fileSizeLimits.document;
    if (buffer.length > sizeLimit) {
      const limitMB = Math.round(sizeLimit / (1024 * 1024));
      const error = new Error(`File size exceeds ${limitMB}MB limit`);
      error.code = 'MEDIA_VALIDATION_ERROR';
      throw error;
    }

    if (detectedType === 'image') {
      return CloudinaryService.uploadBuffer(buffer, options);
    }

    return SupabaseStorageService.uploadBuffer(buffer, fileName, mimeType, options);
  }

  async delete(mediaUrl, provider) {
    if (!mediaUrl) return null;

    const resolvedProvider = provider || this._detectProviderFromUrl(mediaUrl);

    if (resolvedProvider === 'cloudinary') {
      const publicId = CloudinaryService.extractPublicId(mediaUrl);
      if (!publicId) return null;
      return CloudinaryService.destroy(publicId);
    }

    if (resolvedProvider === 'supabase') {
      const filePath = SupabaseStorageService.extractPath(mediaUrl);
      if (!filePath) return null;
      return SupabaseStorageService.removeByFullPath(filePath);
    }

    return null;
  }

  async replace(oldMediaUrl, newFile, options = {}) {
    const uploadResult = await this.upload(newFile, options);

    if (oldMediaUrl) {
      try {
        await this.delete(oldMediaUrl, options.provider);
      } catch {
        logger.warn('MediaService.replace', 'Failed to delete old media', { url: oldMediaUrl });
      }
    }

    return uploadResult;
  }

  _resolveProvider(detectedType) {
    const typeConfig = MEDIA_CONFIG.typeMap[detectedType];
    return typeConfig?.provider || 'supabase';
  }

  _defaultBucket(detectedType) {
    const bucketMap = {
      document: 'documents',
      video: 'materials',
    };
    return bucketMap[detectedType] || 'documents';
  }

  _detectProviderFromUrl(url) {
    if (!url) return null;
    if (url.includes('cloudinary.com')) return 'cloudinary';
    if (url.includes('supabase.co')) return 'supabase';
    return null;
  }

  _getExtension(filename) {
    if (!filename) return '';
    const dot = filename.lastIndexOf('.');
    return dot === -1 ? '' : filename.slice(dot).toLowerCase();
  }
}

export default new MediaService();
