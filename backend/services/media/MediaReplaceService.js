import MediaService from './MediaService.js';
import MediaDeleteService from './MediaDeleteService.js';

class MediaReplaceService {
  async replace(oldMediaUrl, newFile, options = {}) {
    if (!newFile) {
      throw new Error('No new file provided for replacement');
    }

    const uploadResult = await MediaService.upload(newFile, options);

    if (oldMediaUrl) {
      try {
        await MediaDeleteService.deleteByUrl(oldMediaUrl);
      } catch (deleteError) {
        console.warn('Old media deletion failed (non-blocking):', deleteError.message);
      }
    }

    return {
      oldUrl: oldMediaUrl,
      newUrl: uploadResult.url,
      provider: options.provider || 'auto',
      uploadResult,
    };
  }

  async replaceAndUpdateRecord(oldMediaUrl, newFile, record, fieldName, options = {}) {
    const result = await this.replace(oldMediaUrl, newFile, options);

    if (record && fieldName) {
      record[fieldName] = result.newUrl;
      await record.save();
    }

    return result;
  }

  async replaceMultiple(replacements) {
    const results = [];

    for (const { oldUrl, newFile, options } of replacements) {
      try {
        const result = await this.replace(oldUrl, newFile, options);
        results.push({ oldUrl, success: true, result });
      } catch (error) {
        results.push({ oldUrl, success: false });
      }
    }

    return results;
  }
}

export default new MediaReplaceService();
