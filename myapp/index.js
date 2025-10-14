const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const app = express();
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  // Callback URL ต้องตรงกับ Port ใหม่ที่เราใช้
  callbackURL: "http://localhost:3001/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

// Route สำหรับหน้าเว็บหลัก (Login)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});


// ✅ ===== จุดแก้ไขที่ 1: เพิ่มตัวดักจับเพื่อ Debug ===== ✅
// เราจะเพิ่ม console.log เพื่อดูว่า Server ได้รับคำขอหรือไม่
app.get('/auth/google', (req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ✅ Received a request to /auth/google.`);
  console.log('Starting Google authentication...');
  // เรียกใช้ passport เพื่อเริ่มกระบวนการ Login
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});


// Route ที่ Google จะส่งข้อมูลกลับมาหลัง Login สำเร็จ
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    console.log('✅ Google authentication successful. Redirecting...');
    // ส่งต่อไปยัง Teamulate ที่หน้า /workspace
    res.redirect('http://localhost:3000/workspace');
  }
);

// เปลี่ยน Port ที่รันโปรเจกต์ Login เป็น 3001
const port = 3001;
app.listen(port, () => {
  console.log(`✅ Login server is running. Please open your browser at http://localhost:${port}`);
});