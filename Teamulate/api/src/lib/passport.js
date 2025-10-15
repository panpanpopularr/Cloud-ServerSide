// api/src/lib/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserModel } from '../models/user.model.js';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  console.warn('[auth] Google OAuth env not set. Google login will be disabled.');
} else {
  passport.use(new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || `${profile.id}@google.local`;
        const name = profile.displayName || profile.name?.givenName || null;
        const avatar = profile.photos?.[0]?.value || null;
        const user = await UserModel.upsertFromGoogle({ email, name, avatar });
        return done(null, { id: user.id, email: user.email, name: user.name, role: user.role });
      } catch (e) {
        return done(e);
      }
    }
  ));
}

passport.serializeUser((user, done) => {
  // เก็บเฉพาะ id พอ
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const u = await UserModel.findById(id);
    if (!u) return done(null, false);
    done(null, { id: u.id, email: u.email, name: u.name, role: u.role });
  } catch (e) {
    done(e);
  }
});

export default passport;
