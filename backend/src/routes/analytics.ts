import { Router } from 'express';

import { analyticsSummaryHandler } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/authenticate';

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);
analyticsRouter.get('/summary', analyticsSummaryHandler);
