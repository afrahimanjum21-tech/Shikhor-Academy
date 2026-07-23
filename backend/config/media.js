const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

const IMAGE_EXTENSIONS = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'];

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
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folders: {
      courses: 'courses',
      gallery: 'gallery',
      faculty: 'faculty',
      elearning: 'elearning',
      admission: 'admission',
      users: 'users',
      site: 'site',
    },
    transformations: {
      thumbnail: { width: 400, height: 300, crop: 'fill', quality: 'auto' },
      preview: { width: 200, height: 150, crop: 'fill', quality: 'auto' },
    },
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    buckets: {
      documents: 'documents',
      assignments: 'assignments',
      submissions: 'submissions',
      materials: 'materials',
    },
    signedUrlExpiry: 3600,
  },

  fileSizeLimits: {
    image: 5 * 1024 * 1024,
    document: 20 * 1024 * 1024,
    video: 100 * 1024 * 1024,
  },

  typeMap: {
    image: { mime: IMAGE_TYPES, ext: IMAGE_EXTENSIONS, provider: 'cloudinary' },
    document: { mime: DOCUMENT_TYPES, ext: DOCUMENT_EXTENSIONS, provider: 'supabase' },
    video: { mime: VIDEO_TYPES, ext: VIDEO_EXTENSIONS, provider: 'supabase' },
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
