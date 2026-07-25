import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { db } from '../lib/db';
import { AuthResponse, JwtPayload, PublicUser } from '../types/auth.types';

const SALT_ROUNDS = 10;

function signToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');

  const payload: JwtPayload = { sub: userId, email };
  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) ?? '7d',
  });
}

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}): PublicUser {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

// ─── Register ─────────────────────────────────────────────────────────────────
export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw Object.assign(new Error('An account with this email already exists'), {
      statusCode: 409,
    });
  }

  const passwordHash = await bcryptjs.hash(password, SALT_ROUNDS);
  const user = await db.user.create({ data: { name, email, passwordHash } });

  return { token: signToken(user.id, user.email), user: toPublicUser(user) };
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<AuthResponse> {
  const user = await db.user.findUnique({ where: { email } });

  // Constant-time comparison even on missing user to prevent timing attacks
  const dummyHash = '$2a$10$invalidhashusedfortimingprotection000000000000000000000';
  const hashToCheck = user?.passwordHash ?? dummyHash;
  const isValid = await bcryptjs.compare(password, hashToCheck);

  if (!user || !isValid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  if (!user.passwordHash) {
    throw Object.assign(
      new Error('This account uses Google sign-in. Please sign in with Google.'),
      { statusCode: 401 },
    );
  }

  return { token: signToken(user.id, user.email), user: toPublicUser(user) };
}

// ─── Find or create Google OAuth user ────────────────────────────────────────
export async function findOrCreateGoogleUser(profile: {
  googleId: string;
  email: string;
  name: string;
}): Promise<PublicUser> {
  // Try to find by googleId first, then fall back to email (links existing account)
  let user = await db.user.findFirst({
    where: {
      OR: [{ googleId: profile.googleId }, { email: profile.email }],
    },
  });

  if (user) {
    // Link googleId to existing email account if not already linked
    if (!user.googleId) {
      user = await db.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId },
      });
    }
  } else {
    user = await db.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
      },
    });
  }

  return toPublicUser(user);
}

// ─── Get user by id (used by JWT middleware) ─────────────────────────────────
export async function findById(id: string): Promise<PublicUser | null> {
  const user = await db.user.findUnique({ where: { id } });
  return user ? toPublicUser(user) : null;
}

export { signToken };
