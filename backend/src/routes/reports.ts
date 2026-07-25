import { Router } from 'express';

import { monthlyReportHandler } from '../controllers/report.controller';
import { authenticate } from '../middleware/authenticate';

export const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.get('/monthly', monthlyReportHandler);
