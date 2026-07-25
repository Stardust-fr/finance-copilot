import { Router } from 'express';

import {
  deleteBudgetHandler,
  getBudgetsHandler,
  upsertBudgetHandler,
} from '../controllers/budget.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { deleteBudgetSchema, upsertBudgetSchema } from '../schemas/budget.schemas';

export const budgetRouter = Router();

budgetRouter.use(authenticate);

budgetRouter.get('/', getBudgetsHandler);
budgetRouter.post('/', validate(upsertBudgetSchema), upsertBudgetHandler);
budgetRouter.delete('/:category', validate(deleteBudgetSchema), deleteBudgetHandler);
