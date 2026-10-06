import { Router } from 'express';

import {
  bulkDeleteHandler,
  bulkRecategorizeHandler,
  deleteTransactionHandler,
  listTransactionsHandler,
  updateCategoryHandler,
} from '../controllers/transaction.controller';
import { uploadCsvHandler } from '../controllers/import.controller';
import { authenticate } from '../middleware/authenticate';
import { uploadMiddleware } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  bulkDeleteSchema,
  bulkRecategorizeSchema,
  deleteTransactionSchema,
  listTransactionsSchema,
  updateCategorySchema,
} from '../schemas/transaction.schemas';

export const transactionsRouter = Router();

transactionsRouter.use(authenticate);

transactionsRouter.get('/', validate(listTransactionsSchema), listTransactionsHandler);
transactionsRouter.post('/upload', uploadMiddleware.single('file'), uploadCsvHandler);
transactionsRouter.post('/bulk-delete', validate(bulkDeleteSchema), bulkDeleteHandler);
transactionsRouter.post('/bulk-recategorize', validate(bulkRecategorizeSchema), bulkRecategorizeHandler);
transactionsRouter.patch('/:id/category', validate(updateCategorySchema), updateCategoryHandler);
transactionsRouter.delete('/:id', validate(deleteTransactionSchema), deleteTransactionHandler);

