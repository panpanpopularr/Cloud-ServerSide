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
  console.warn('[auth] Google OAuth env not set. Google login disabled.');
} else {
  passport.use(new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    // verify callback
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email =
          profile.emails?.[0]?.value ||
          `${profile.id}@google.local`;
        const name = profile.displayName || profile.name?.givenName || null;
        const avatar = profile.photos?.[0]?.value || null;

        const user = await UserModel.upsertFromGoogle({ email, name, avatar });
        return done(null, user);
      } catch (e) {
        return done(e);
      }
    }
  ));
}

// (เราไม่ได้ใช้ session ของ passport เป็นหลัก แต่ใส่ไว้ไม่ให้พัง)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const u = await UserModel.findById(id);
    done(null, u);
  } catch (e) {
    done(e);
  }
});

export default passport;
