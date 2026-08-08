const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const IMAGE_EXTENSIONS = ['.jpeg', '.jpg', '.png', '.gif', '.webp'];

const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
  'text/csv',
];

const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.zip', '.rar', '.csv'];

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/x-msvideo'];

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.avi'];

export const MEDIA_CONFIG = {
  fileSizeLimits: {
    image: 5 * 1024 * 1024,
    document: 20 * 1024 * 1024,
    video: 100 * 1024 * 1024,
  },

  typeMap: {
    image: { mime: IMAGE_TYPES, ext: IMAGE_EXTENSIONS, provider: 'local' },
    document: { mime: DOCUMENT_TYPES, ext: DOCUMENT_EXTENSIONS, provider: 'local' },
    video: { mime: VIDEO_TYPES, ext: VIDEO_EXTENSIONS, provider: 'local' },
  },
};

export const detectFileType = (mimeType, extension) => {
  const ext = extension?.toLowerCase();
  const mime = mimeType?.toLowerCase();

  if (IMAGE_TYPES.includes(mime) || IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (VIDEO_TYPES.includes(mime) || VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (DOCUMENT_TYPES.includes(mime) || DOCUMENT_EXTENSIONS.includes(ext)) return 'document';

  return null;
};
