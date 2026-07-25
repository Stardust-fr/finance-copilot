import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { findById } from '../services/auth.service';
import { JwtPayload } from '../types/auth.types';

/**
 * Protects a route by verifying the Bearer JWT in the Authorization header.
 * On success, attaches the user to req.user.
 * On failure, returns 401.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');

    const payload = jwt.verify(token, secret) as JwtPayload;
    const user = await findById(payload.sub);

    if (!user) {
      res.status(401).json({ success: false, message: 'User no longer exists' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }
    next(err);
  }
}
