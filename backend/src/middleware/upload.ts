import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

// MIME types for CSV and Excel formats
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/octet-stream',
  'application/vnd.ms-excel',                                        // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
];

const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  const ext = '.' + file.originalname.toLowerCase().split('.').pop();
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (mimeOk || extOk) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and Excel (.xls, .xlsx) files are supported'));
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
