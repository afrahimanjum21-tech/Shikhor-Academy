import MediaValidator from './MediaValidator.js';
import LocalFileService from './LocalFileService.js';
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
      const uploadOptions = { ...options };
      if (!uploadOptions.folder) {
        uploadOptions.folder = options.folder || 'general';
      }

      let result;
      if (file.buffer) {
        result = await LocalFileService.uploadBuffer(
          file.buffer,
          file.originalname,
          file.mimetype,
          uploadOptions
        );
      } else {
        result = await LocalFileService.upload(file, uploadOptions);
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

    if (!options.folder) {
      options.folder = 'general';
    }

    return LocalFileService.uploadBuffer(buffer, fileName, mimeType, options);
  }

  async delete(mediaUrl, provider) {
    if (!mediaUrl) return null;
    return LocalFileService.delete(mediaUrl);
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

  _getExtension(filename) {
    if (!filename) return '';
    const dot = filename.lastIndexOf('.');
    return dot === -1 ? '' : filename.slice(dot).toLowerCase();
  }
}

export default new MediaService();
