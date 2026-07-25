import { Router } from 'express';
import passport from 'passport';

import {
  googleCallbackHandler,
  loginHandler,
  meHandler,
  registerHandler,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../schemas/auth.schemas';

export const authRouter = Router();

// ─── Email / password ─────────────────────────────────────────────────────────
authRouter.post('/register', validate(registerSchema), registerHandler);
authRouter.post('/login', validate(loginSchema), loginHandler);

// ─── Protected ───────────────────────────────────────────────────────────────
authRouter.get('/me', authenticate, meHandler);

// ─── Google OAuth ─────────────────────────────────────────────────────────────
authRouter.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth' }),
  googleCallbackHandler,
);
