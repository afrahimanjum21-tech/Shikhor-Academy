import LocalFileService from './LocalFileService.js';

class MediaDeleteService {
  async deleteByUrl(mediaUrl) {
    if (!mediaUrl) return null;
    return LocalFileService.delete(mediaUrl);
  }

  async deleteMultiple(urls) {
    const results = [];
    for (const url of urls) {
      try {
        const result = await this.deleteByUrl(url);
        results.push({ url, success: true, result });
      } catch (error) {
        results.push({ url, success: false });
      }
    }
    return results;
  }

  async deleteByRecord(record, pathField, providerField) {
    if (!record) return null;
    const mediaUrl = record[pathField];
    if (!mediaUrl) return null;
    return this.deleteByUrl(mediaUrl);
  }

  async deleteMultipleRecords(records, pathField) {
    const results = [];
    for (const record of records) {
      try {
        const result = await this.deleteByRecord(record, pathField);
        results.push({ record: record.id, success: true, result });
      } catch (error) {
        results.push({ record: record.id, success: false });
      }
    }
    return results;
  }
}

export default new MediaDeleteService();
