import { MEDIA_CONFIG, detectFileType } from '../../config/media.js';
import logger from '../logger.js';

const SIGNATURES = {
  jpeg: [[0xFF, 0xD8, 0xFF]],
  jpg: [[0xFF, 0xD8, 0xFF]],
  png: [[0x89, 0x50, 0x4E, 0x47]],
  gif: [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  webp: [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
  svg: [[0x3C, 0x73, 0x76, 0x67], [0x3C, 0x3F, 0x78, 0x6D]],
  pdf: [[0x25, 0x50, 0x44, 0x46]],
  doc: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
  docx: [[0x50, 0x4B, 0x03, 0x04]],
  xls: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
  xlsx: [[0x50, 0x4B, 0x03, 0x04]],
  ppt: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
  pptx: [[0x50, 0x4B, 0x03, 0x04]],
  mp4: [[null, null, null, null, 0x66, 0x74, 0x79, 0x70]],
  webm: [[0x1A, 0x45, 0xDF, 0xA3]],
  ogg: [[0x4F, 0x67, 0x67, 0x53]],
  avi: [[0x52, 0x49, 0x46, 0x46]],
  zip: [[0x50, 0x4B, 0x03, 0x04]],
  rar: [[0x52, 0x61, 0x72, 0x21, 0x1A, 0x07]],
  txt: [],
  csv: [],
};

const EXT_TO_MAGIC_KEY = {
  '.jpeg': 'jpeg', '.jpg': 'jpg', '.png': 'png', '.gif': 'gif',
  '.webp': 'webp', '.svg': 'svg',
  '.pdf': 'pdf',
  '.doc': 'doc', '.docx': 'docx',
  '.xls': 'xls', '.xlsx': 'xlsx',
  '.ppt': 'ppt', '.pptx': 'pptx',
  '.mp4': 'mp4', '.webm': 'webm', '.ogg': 'ogg', '.avi': 'avi',
  '.zip': 'zip', '.rar': 'rar',
  '.txt': 'txt', '.csv': 'csv',
};

function checkSignature(buffer, signatures) {
  if (!buffer || buffer.length === 0) return false;
  if (signatures.length === 0) return true;
  const bytes = new Uint8Array(buffer);
  return signatures.some(sig => {
    for (let i = 0; i < sig.length; i++) {
      if (sig[i] !== null && (i >= bytes.length || bytes[i] !== sig[i])) return false;
    }
    return true;
  });
}

function getBufferFromFile(file) {
  if (file.buffer) return file.buffer;
  return null;
}

function sanitizeString(str) {
  if (!str) return '';
  return str
    .replace(/[<>]/g, '')
    .replace(/[&]/g, '')
    .replace(/['"]/g, '')
    .replace(/[\\/]/g, '-')
    .replace(/[\x00-\x1f]/g, '')
    .trim();
}

class MediaValidator {
  validate(file, expectedType) {
    const errors = [];

    if (!file) {
      return { valid: false, errors: ['No file provided'] };
    }

    if (!file.buffer && !file.path && !file.tempFilePath) {
      return { valid: false, errors: ['File has no data'] };
    }

    const mimeType = file.mimetype || '';
    const originalname = file.originalname || file.name || '';
    const extension = this._getExtension(originalname);
    const detectedType = detectFileType(mimeType, extension);

    if (!detectedType) {
      return { valid: false, errors: [`Unsupported file type: ${mimeType || extension}`] };
    }

    if (expectedType && detectedType !== expectedType) {
      return { valid: false, errors: [`Expected ${expectedType} but received ${detectedType}`] };
    }

    const sizeLimit = MEDIA_CONFIG.fileSizeLimits[detectedType] || MEDIA_CONFIG.fileSizeLimits.document;
    const fileSize = file.buffer?.length || file.size || 0;

    if (fileSize > sizeLimit) {
      const limitMB = Math.round(sizeLimit / (1024 * 1024));
      errors.push(`File size exceeds ${limitMB}MB limit`);
    }

    const buffer = getBufferFromFile(file);
    if (buffer) {
      const magicKey = EXT_TO_MAGIC_KEY[extension];
      const signatures = SIGNATURES[magicKey];
      if (signatures && !checkSignature(buffer, signatures)) {
        logger.warn('MediaValidator', `Magic byte mismatch for ${originalname} (${mimeType || extension})`);
        errors.push('File content does not match its extension');
      }
    }

    if (originalname) {
      file.originalname = sanitizeString(originalname);
    }

    return {
      valid: errors.length === 0,
      errors,
      detectedType,
      mimeType,
      extension,
      size: fileSize,
    };
  }

  validateMultiple(files, expectedType) {
    return files.map((file, index) => ({
      index,
      ...this.validate(file, expectedType),
    }));
  }

  _getExtension(filename) {
    if (!filename) return '';
    const dot = filename.lastIndexOf('.');
    return dot === -1 ? '' : filename.slice(dot).toLowerCase();
  }
}

export default new MediaValidator();
