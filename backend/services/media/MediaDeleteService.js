import CloudinaryService from './CloudinaryService.js';
import SupabaseStorageService from './SupabaseStorageService.js';

class MediaDeleteService {
  async deleteByUrl(mediaUrl) {
    if (!mediaUrl) return null;

    const provider = this._detectProvider(mediaUrl);

    if (provider === 'cloudinary') {
      return this._deleteFromCloudinary(mediaUrl);
    }

    if (provider === 'supabase') {
      return this._deleteFromSupabase(mediaUrl);
    }

    return null;
  }

  async deleteMultiple(urls) {
    const results = [];
    for (const url of urls) {
      try {
        const result = await this.deleteByUrl(url);
        results.push({ url, success: true, result });
      } catch (error) {
        results.push({ url, success: false, error: error.message });
      }
    }
    return results;
  }

  async deleteByRecord(record, pathField, providerField) {
    if (!record) return null;

    const mediaUrl = record[pathField];
    if (!mediaUrl) return null;

    const provider = providerField ? record[providerField] : null;
    return this.deleteByUrl(mediaUrl);
  }

  async deleteMultipleRecords(records, pathField) {
    const results = [];
    for (const record of records) {
      try {
        const result = await this.deleteByRecord(record, pathField);
        results.push({ record: record.id, success: true, result });
      } catch (error) {
        results.push({ record: record.id, success: false, error: error.message });
      }
    }
    return results;
  }

  _deleteFromCloudinary(url) {
    const publicId = CloudinaryService.extractPublicId(url);
    if (!publicId) return null;
    return CloudinaryService.destroy(publicId);
  }

  _deleteFromSupabase(url) {
    const filePath = SupabaseStorageService.extractPath(url);
    if (!filePath) return null;
    return SupabaseStorageService.removeByFullPath(filePath);
  }

  _detectProvider(url) {
    if (!url) return null;
    if (url.includes('cloudinary.com')) return 'cloudinary';
    if (url.includes('supabase.co')) return 'supabase';
    return null;
  }
}

export default new MediaDeleteService();
