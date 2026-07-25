import { Router } from 'express';

import {
  deleteTransactionHandler,
  listTransactionsHandler,
  updateCategoryHandler,
} from '../controllers/transaction.controller';
import { uploadCsvHandler } from '../controllers/import.controller';
import { authenticate } from '../middleware/authenticate';
import { uploadMiddleware } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  deleteTransactionSchema,
  listTransactionsSchema,
  updateCategorySchema,
} from '../schemas/transaction.schemas';

export const transactionsRouter = Router();

transactionsRouter.use(authenticate);

transactionsRouter.get('/', validate(listTransactionsSchema), listTransactionsHandler);
transactionsRouter.post('/upload', uploadMiddleware.single('file'), uploadCsvHandler);
transactionsRouter.patch('/:id/category', validate(updateCategorySchema), updateCategoryHandler);
transactionsRouter.delete('/:id', validate(deleteTransactionSchema), deleteTransactionHandler);
