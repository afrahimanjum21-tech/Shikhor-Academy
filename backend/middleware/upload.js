import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const getUploadDir = (subDir) => {
  return path.join(BACKEND_ROOT, 'uploads', subDir);
};

const createStorage = (subDir) => {
  if (process.env.VERCEL === '1') {
    return multer.memoryStorage();
  }
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = getUploadDir(subDir);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${subDir}_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;
      cb(null, name);
    },
  });
};

// H-low4: ANCHORED allowlists. The old `/jpeg|jpg|png.../` was unanchored, so
// a crafted name/mime like `.notpng` or `image/png-evil` matched the substring
// and slipped through. These require the extension to be the ACTUAL final
// extension and the MIME to be an exact allowed value. Pure + exported for
// unit tests. NOTE: txt/csv are accepted by extension only (no magic-byte
// sniffing); they are inert text and are served with `nosniff` + a locked-down
// file CSP (see app.js), so they cannot execute as markup/script.
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp)$/i;
const IMAGE_MIME_RE = /^image\/(jpe?g|png|gif|webp)$/i;
const FILE_EXT_RE = /\.(jpe?g|png|gif|webp|pdf|docx?|xlsx?|pptx?|txt|zip|rar|csv)$/i;

export const isAllowedImage = (originalname, mimetype) =>
  IMAGE_EXT_RE.test(String(originalname || '')) && IMAGE_MIME_RE.test(String(mimetype || ''));

export const isAllowedFile = (originalname) => FILE_EXT_RE.test(String(originalname || ''));

const imageFilter = (req, file, cb) => {
  if (isAllowedImage(file.originalname, file.mimetype)) cb(null, true);
  else cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'), false);
};

const fileFilter = (req, file, cb) => {
  if (isAllowedFile(file.originalname)) cb(null, true);
  else cb(new Error('File type not allowed'), false);
};

export const uploadPhoto = (subDir, maxMB = 5) => multer({
  storage: createStorage(subDir),
  fileFilter: imageFilter,
  limits: { fileSize: maxMB * 1024 * 1024 },
});

export const uploadFile = (subDir) => multer({
  storage: createStorage(subDir),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});
