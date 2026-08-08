import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import MediaAsset from '../../models/MediaAsset.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '../..');

const UPLOADS_DIR = process.env.VERCEL === '1'
  ? '/tmp/uploads'
  : path.join(BACKEND_ROOT, 'uploads');

const USE_DATABASE_STORAGE = process.env.VERCEL === '1' || process.env.MEDIA_DRIVER === 'database';

class LocalFileService {
  async upload(file, options = {}) {
    const folder = options.folder || 'general';
    const ext = path.extname(file.originalname || 'file');
    const filename = `${folder}_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;

    if (USE_DATABASE_STORAGE) {
      const data = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
      if (!data) {
        throw new Error('No file data available');
      }

      await MediaAsset.create({
        folder,
        filename,
        original_name: file.originalname || filename,
        mime_type: file.mimetype || 'application/octet-stream',
        size: data.length,
        data,
      });

      return {
        url: `/uploads/${folder}/${filename}`,
        path: `/uploads/${folder}/${filename}`,
        filename,
      };
    }

    const destDir = path.join(UPLOADS_DIR, folder);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, filename);

    if (file.buffer) {
      fs.writeFileSync(destPath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, destPath);
    } else {
      throw new Error('No file data available');
    }

    return {
      url: `/uploads/${folder}/${filename}`,
      path: destPath,
      filename,
    };
  }

  async uploadBuffer(buffer, fileName, mimeType, options = {}) {
    const folder = options.folder || 'general';
    const ext = path.extname(fileName || 'file');
    const filename = `${folder}_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;

    if (USE_DATABASE_STORAGE) {
      await MediaAsset.create({
        folder,
        filename,
        original_name: fileName || filename,
        mime_type: mimeType || 'application/octet-stream',
        size: buffer.length,
        data: buffer,
      });

      return {
        url: `/uploads/${folder}/${filename}`,
        path: `/uploads/${folder}/${filename}`,
        filename,
      };
    }

    const destDir = path.join(UPLOADS_DIR, folder);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, filename);
    fs.writeFileSync(destPath, buffer);

    return {
      url: `/uploads/${folder}/${filename}`,
      path: destPath,
      filename,
    };
  }

  async delete(fileUrl) {
    if (!fileUrl) return null;
    const relativePath = this.extractPath(fileUrl);
    if (!relativePath) return false;

    if (USE_DATABASE_STORAGE) {
      const [folder, ...fileParts] = relativePath.split('/');
      const filename = fileParts.join('/');
      const deleted = await MediaAsset.destroy({ where: { folder, filename } });
      return deleted > 0;
    }

    const filePath = path.join(UPLOADS_DIR, relativePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  extractPath(url) {
    if (!url) return null;
    const match = url.match(/\/uploads\/(.+)/);
    return match ? match[1] : null;
  }

  async findByUrl(fileUrl) {
    const relativePath = this.extractPath(fileUrl);
    if (!relativePath) return null;
    const [folder, ...fileParts] = relativePath.split('/');
    const filename = fileParts.join('/');
    if (!folder || !filename) return null;
    return MediaAsset.findOne({ where: { folder, filename } });
  }

  async serve(req, res, next) {
    try {
      const folder = req.params.folder;
      const filename = req.params.filename;

      if (!folder || !filename || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ message: 'Invalid media path' });
      }

      const asset = await MediaAsset.findOne({ where: { folder, filename } });
      if (!asset) return res.status(404).json({ message: 'Media not found' });

      let buffer = Buffer.isBuffer(asset.data) ? asset.data : Buffer.from(asset.data);

      // Some PDFs carry a bogus embedded /Title (e.g. Bijoy-encoded Bangla),
      // and browsers show that instead of the Content-Disposition filename.
      // Rewrite it to the admin-provided material title when we can.
      if (asset.mime_type === 'application/pdf' && folder === 'general') {
        const title = await this.findMaterialTitle(filename);
        if (title) {
          buffer = this.rewritePdfTitle(buffer, title);
        }
      }

      res.setHeader('Content-Type', asset.mime_type || 'application/octet-stream');
      res.setHeader('Content-Length', buffer.length);
      const isImage = (asset.mime_type || '').startsWith('image/');
      if (isImage) {
        // Uploaded filenames are unique, so images are immutable once served.
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // Not "immutable": the Content-Disposition header (used as the PDF tab
        // title) can change, so the browser must revalidate instead of reusing
        // a stale response for a year.
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      }
      return res.end(buffer);
    } catch (error) {
      return next(error);
    }
  }

  async findMaterialTitle(filename) {
    try {
      const models = await import('../../models/index.js');
      const material = await models.default.StudyMaterial.findOne({
        where: { file_path: `/uploads/general/${filename}` },
        attributes: ['title'],
      });
      return material?.title ? String(material.title).trim() : null;
    } catch {
      return null;
    }
  }

  // Replaces the PDF's embedded /Title with the given title WITHOUT changing
  // the byte length, so cross-reference offsets stay valid. The replacement is
  // encoded as a plain string when possible (PDFDocEncoding/Latin-1), else as
  // a UTF-16BE hex string, and padded with whitespace (legal before ">>").
  rewritePdfTitle(buffer, title) {
    try {
      const text = buffer.toString('latin1');
      const infoMatch = text.match(/\/Info\s+(\d+)\s+0\s+R/);
      if (!infoMatch) return buffer;

      const objStart = text.indexOf(`${infoMatch[1]} 0 obj`);
      if (objStart === -1) return buffer;

      const titleIdx = text.indexOf('/Title', objStart);
      if (titleIdx === -1) return buffer;

      const after = text.slice(titleIdx + '/Title'.length);
      const parenMatch = after.match(/^\s*\(/);
      if (!parenMatch) return buffer;

      const strStart = titleIdx + '/Title'.length + parenMatch[0].length - 1;
      let parenDepth = 1;
      let i = strStart + 1;
      while (i < text.length && parenDepth > 0) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === '(') parenDepth++;
        else if (text[i] === ')') parenDepth--;
        i++;
      }
      if (parenDepth !== 0) return buffer;

      const strEnd = i - 1;
      const oldLen = strEnd - strStart + 1;

      let replacement = null;
      // 1) Plain string (PDFDocEncoding) — works for ASCII titles.
      if (Array.from(title).every((ch) => ch.charCodeAt(0) < 0x100)) {
        const plain = `(${title.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')})`;
        if (plain.length <= oldLen) replacement = plain;
      }
      // 2) UTF-16BE hex string with BOM — works for any Unicode title that fits.
      if (!replacement) {
        const hex = 'FEFF' + Array.from(title)
          .map((ch) => ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
          .join('');
        const hexStr = `<${hex}>`;
        if (hexStr.length <= oldLen) replacement = hexStr;
      }
      if (!replacement) return buffer;

      const padded = replacement + ' '.repeat(oldLen - replacement.length);
      return Buffer.from(text.slice(0, strStart) + padded + text.slice(strEnd + 1), 'latin1');
    } catch {
      return buffer;
    }
  }
}

export default new LocalFileService();
