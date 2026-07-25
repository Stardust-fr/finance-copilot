import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

// Store file in memory as a Buffer — no disk writes needed
const storage = multer.memoryStorage();

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  const allowed = ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream'];
  const ext = file.originalname.toLowerCase().endsWith('.csv');

  if (allowed.includes(file.mimetype) || ext) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'));
  }
}

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
    files: 1,
  },
});
