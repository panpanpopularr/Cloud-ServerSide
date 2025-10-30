// api/src/lib/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './prisma.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const CALLBACK_URL =
  process.env.GOOGLE_CALLBACK ||
  (process.env.API_URL
    ? `${process.env.API_URL.replace(/\/+$/, '')}/auth/google/callback`
    : 'http://localhost:4000/auth/google/callback');

passport.serializeUser((user, done) => done(null, user?.id || user));
passport.deserializeUser((id, done) => done(null, id));

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      { clientID: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, callbackURL: CALLBACK_URL },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = (profile.emails?.[0]?.value || '').toLowerCase();
          const name =
            profile.displayName ||
            `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() ||
            null;
          if (!email) return done(new Error('no_email_in_google_profile'));

          let user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            user = await prisma.user.create({ data: { email, name, role: 'user' } });
          } else if (!user.name && name) {
            user = await prisma.user.update({ where: { id: user.id }, data: { name } });
          }
          return done(null, user);
        } catch (e) {
          return done(e);
        }
      }
    )
  );
} else {
  console.warn('Google OAuth not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing).');
}

export default passport;
