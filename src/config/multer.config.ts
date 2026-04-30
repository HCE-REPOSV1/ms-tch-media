import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads');

export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
      const ext    = path.extname(file.originalname);
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, unique);
    },
  }),
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE_MB ?? 50) * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = (process.env.ALLOWED_TYPES ?? '').split(',').filter(Boolean);
    if (!allowed.length || allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
    }
  },
};
