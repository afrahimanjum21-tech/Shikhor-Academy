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

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype.split('/')[1]);
  if (extOk && mimeOk) cb(null, true);
  else cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'), false);
};

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  if (extOk) cb(null, true);
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
