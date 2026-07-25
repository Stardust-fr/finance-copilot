import { Router } from 'express';

import { categorizeHandler, chatHandler } from '../controllers/ai.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { categorizeSchema, chatSchema } from '../schemas/ai.schemas';

export const aiRouter = Router();

aiRouter.use(authenticate);

aiRouter.post('/categorize', validate(categorizeSchema), categorizeHandler);
aiRouter.post('/chat', validate(chatSchema), chatHandler);
