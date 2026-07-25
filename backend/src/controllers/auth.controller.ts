import { NextFunction, Request, Response } from 'express';

import { login, register } from '../services/auth.service';
import { signToken } from '../services/auth.service';
import { LoginInput, RegisterInput } from '../schemas/auth.schemas';

// POST /auth/register
export async function registerHandler(
  req: Request<object, object, RegisterInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, email, password } = req.body;
    const result = await register(name, email, password);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// POST /auth/login
export async function loginHandler(
  req: Request<object, object, LoginInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /auth/me  (protected)
export async function meHandler(req: Request, res: Response): Promise<void> {
  res.status(200).json({ success: true, data: { user: req.user } });
}

// GET /auth/google/callback — called after Google OAuth completes
export async function googleCallbackHandler(req: Request, res: Response): Promise<void> {
  // req.user is set by Passport; issue a JWT and redirect to frontend
  const user = req.user!;
  const token = signToken(user.id, user.email);

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
}
