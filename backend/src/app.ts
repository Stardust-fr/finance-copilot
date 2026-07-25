import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';

import { configurePassport } from './config/passport';
import { aiRouter } from './routes/ai';
import { analyticsRouter } from './routes/analytics';
import { authRouter } from './routes/auth';
import { budgetRouter } from './routes/budget';
import { healthRouter } from './routes/health';
import { reportsRouter } from './routes/reports';
import { transactionsRouter } from './routes/transactions';

// Initialise Passport strategies
configurePassport();

const app: Application = express();

// ─── Security & parsing middleware ───────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(passport.initialize());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/transactions', transactionsRouter);
app.use('/analytics', analyticsRouter);
app.use('/ai', aiRouter);
app.use('/budget', budgetRouter);
app.use('/reports', reportsRouter);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.statusCode ?? 500;
  console.error(`[error] ${status} — ${err.message}`);
  res.status(status).json({
    success: false,
    message:
      status === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
  });
});

export default app;
