const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const morgan = require('morgan');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new Database(path.join(__dirname, 'cleanup.db'));

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS cleanups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    items TEXT NOT NULL,
    location_type TEXT,
    ward TEXT,
    latitude REAL,
    longitude REAL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    photo_path TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 6 },
  })
);

// Helpers
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

function setUserLocals(req, res, next) {
  res.locals.currentUser = req.session.user;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
}

app.use(setUserLocals);

// File upload configuration
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `cleanup-${timestamp}${ext}`);
  },
});

const upload = multer({ storage });

// Routes
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/cleanups');
  }
  return res.redirect('/login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    req.session.flash = 'Username and password are required.';
    return res.redirect('/register');
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
    req.session.flash = 'Account created. Please log in.';
    return res.redirect('/login');
  } catch (error) {
    console.error(error);
    req.session.flash = 'Username already exists. Choose another.';
    return res.redirect('/register');
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    req.session.flash = 'Invalid username or password.';
    return res.redirect('/login');
  }

  const passwordMatch = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatch) {
    req.session.flash = 'Invalid username or password.';
    return res.redirect('/login');
  }

  req.session.userId = user.id;
  req.session.user = { id: user.id, username: user.username };
  return res.redirect('/cleanups');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/cleanups', requireAuth, (req, res) => {
  const cleanups = db
    .prepare('SELECT * FROM cleanups WHERE user_id = ? ORDER BY start_time DESC')
    .all(req.session.userId);

  res.render('cleanups', { cleanups });
});

app.get('/cleanups/new', requireAuth, (req, res) => {
  res.render('new-cleanup');
});

app.post('/cleanups', requireAuth, upload.single('photo'), (req, res) => {
  const {
    items,
    locationType,
    ward,
    latitude,
    longitude,
    startTime,
    endTime,
  } = req.body;

  if (!items || !startTime || !endTime) {
    req.session.flash = 'Items, start time, and end time are required.';
    return res.redirect('/cleanups/new');
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    req.session.flash = 'Please provide a valid time range (end after start).';
    return res.redirect('/cleanups/new');
  }

  const locationTypeValue = locationType || null;
  const wardValue = locationType === 'ward' ? ward || null : null;
  const latValue = locationType === 'gps' && latitude ? Number(latitude) : null;
  const lngValue = locationType === 'gps' && longitude ? Number(longitude) : null;
  const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare(
    `INSERT INTO cleanups (user_id, items, location_type, ward, latitude, longitude, start_time, end_time, photo_path)
     VALUES (@user_id, @items, @location_type, @ward, @latitude, @longitude, @start_time, @end_time, @photo_path)`
  ).run({
    user_id: req.session.userId,
    items,
    location_type: locationTypeValue,
    ward: wardValue,
    latitude: latValue,
    longitude: lngValue,
    start_time: startTime,
    end_time: endTime,
    photo_path: photoPath,
  });

  req.session.flash = 'Cleanup logged successfully!';
  return res.redirect('/cleanups');
});

// Start server
app.listen(PORT, () => {
  console.log(`Cleanup web logging app listening on port ${PORT}`);
});
