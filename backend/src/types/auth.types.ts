import { User } from '../generated/prisma/client';

// ─── JWT Payload ──────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string; // user id
  email: string;
  iat?: number;
  exp?: number;
}

// ─── Augment Express Request ──────────────────────────────────────────────────
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
    }
  }
}

// ─── Auth response shapes ─────────────────────────────────────────────────────
export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'createdAt'>;
