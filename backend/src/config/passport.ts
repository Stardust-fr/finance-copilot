import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import { findOrCreateGoogleUser } from '../services/auth.service';

export function configurePassport(): void {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    // Google credentials not set yet — OAuth routes will be unavailable
    // until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured
    console.warn(
      '[passport] Google OAuth is not configured. ' +
        'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google sign-in.',
    );
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email returned from Google'), undefined);
          }

          const user = await findOrCreateGoogleUser({
            googleId: profile.id,
            email,
            name: profile.displayName,
          });

          return done(null, user);
        } catch (err) {
          return done(err as Error, undefined);
        }
      },
    ),
  );

  // Session serialization is minimal — we use stateless JWT, not sessions
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user as Express.User));
}
